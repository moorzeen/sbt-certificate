import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano, TupleItem, } from '@ton/core';
import { buildOnchainContent } from '../utils/onchainContent';

export type BatchItem = {
    itemIndex: number;
    itemOwnerAddress: Address;
    itemAuthorityAddress: Address;
    itemContent: any;
    amount: bigint;
};

export const DeployDictValue: DictionaryValue<BatchItem> = {
    serialize(src, builder) {
        const nftMessage = beginCell();
        nftMessage.storeAddress(src.itemOwnerAddress);
        nftMessage.storeRef(buildOnchainContent(src.itemContent));
        nftMessage.storeAddress(src.itemAuthorityAddress);

        builder.storeCoins(src.amount);
        builder.storeRef(nftMessage);
    },

    parse() {
        return {
            itemIndex: 0,
            itemOwnerAddress: new Address(0, Buffer.from([])),
            itemAuthorityAddress: new Address(0, Buffer.from([])),
            itemContent: Cell.EMPTY,
            amount: 0n,
        };
    }
};

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type CollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number | bigint;
    collectionContent: Cell;
    commonContent: Cell;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
};

export function collectionConfigToCell(config: CollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeRef(
            beginCell()
                .storeRef(config.collectionContent)
                .storeRef(config.commonContent)
                .endCell()
        )
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress)
            .endCell()
        ).endCell()
}

export class Collection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Collection(address);
    }

    static createFromConfig(config: CollectionConfig, code: Cell, workchain = 0) {
        const data = collectionConfigToCell(config);
        const init = { code, data };
        return new Collection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeploySbt(
        provider: ContractProvider,
        via: Sender,
        opts: {
            itemIndex: number;
            itemOwnerAddress: Address;
            itemAuthorityAddress: Address;
            itemContent: Cell;
            amount: bigint;
            queryId: number;
        }
    ) {
        const nftMessage = beginCell();
        nftMessage.storeAddress(opts.itemOwnerAddress);
        nftMessage.storeRef(opts.itemContent);
        nftMessage.storeAddress(opts.itemAuthorityAddress);

        await provider.internal(via, {
            value: toNano('0.05') + toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(opts.queryId, 64)
                .storeUint(opts.itemIndex, 64)
                .storeCoins(opts.amount)
                .storeRef(nftMessage)
                .endCell(),
        });
    }

    async sendDeployBatchSbt(
        provider: ContractProvider,
        via: Sender,
        opts: {
            sbts: BatchItem[];
        }
    ) {
        if (opts.sbts.length > 250) {
            throw new Error('More than 250 items');
        }

        const dict = Dictionary.empty(Dictionary.Keys.Uint(64), DeployDictValue);
        for (const sbt of opts.sbts) {
            dict.set(sbt.itemIndex, sbt);
        }

        await provider.internal(via, {
            value: toNano('0.05') + toNano('0.01') * BigInt(dict.size),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeDict(dict).storeInt(0,2).endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider) {
        return await provider.get('get_collection_data', []);
    }

    async getSbtAddressByIndex(provider: ContractProvider, itemIndex: bigint) {
        const index: TupleItem = { type: "int", value: itemIndex };
        return await provider.get('get_nft_address_by_index', [index]);
    }

    async getRoyaltyParams(provider: ContractProvider) {
        return await provider.get('royalty_params', []);
    }

    async getSbtContent(provider: ContractProvider, itemIndex: bigint, sbtContent: Cell) {
        return await provider.get('get_nft_content', [
            { type: 'int', value: itemIndex },
            { type: 'cell', cell: sbtContent },
        ]);
    }

    async getSecondOwner(provider: ContractProvider) {
        return await provider.get('get_second_owner_address', []);
    }

    async returnCollectionBalance(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(5, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender, value: bigint, newOwner: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).storeAddress(newOwner).endCell(),
        });
    }

    async sendSecondOwner(provider: ContractProvider, via: Sender, value: bigint, secondOwner: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(6, 32).storeUint(0, 64).storeAddress(secondOwner).endCell(),
        });
    }

    async changeContent(provider: ContractProvider, via: Sender, value: bigint, content: Cell, royaltyParams: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(4, 32).storeUint(0, 64).storeRef(content).storeRef(royaltyParams).endCell(),
        });
    }
}
