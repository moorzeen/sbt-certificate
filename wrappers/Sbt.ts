import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { buildOnchainContent } from '../utils/onchainContent';

export enum OpCodes {
    transfer = "0x5fcc3d14",
    get_static_data = "0x2fcb26a2",
    revoke = "0x6f89f5e3",
    destroy = "0x1f04537a",
    request_owner = "0xd0c3bfea",
    prove_ownership = "0x04ded148",
    ownership_proof = "0x0524c7ae",
    report_static_data = "0x8b771735",
    owner_info = "0x0dd607e3",
    excesses = "0xd53276db",
    take_excess = "0xd136d3b3",
    change_description = "0x1a0b9d51"
}

export const opCodeToNum = (op: string) => {
    return Number.parseInt(op, 16)
}

const queryId = 1;

export type SbtMetadata = {
    name: string,
    description: string,
    image: string,
    telegram_username: string,
    cohort_number: string,
}

export type SbtConfig = {
    sbt_id: number,
    collection_address: Address,
    sbt_owner_address: Address,
    authority_address: Address,
    content: SbtMetadata,
    revoked_at: number
};

export function sbtConfigToCell(config: SbtConfig): Cell {
    let content = buildOnchainContent(config.content);

    return beginCell()
            .storeUint(config.sbt_id, 64)
            .storeAddress(config.collection_address)
            .storeAddress(config.sbt_owner_address)
            .storeAddress(config.authority_address)
            .storeRef(content)
            .storeUint(config.revoked_at, 64)
        .endCell();
}

export class Sbt implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new Sbt(address);
    }

    static createFromConfig(config: SbtConfig, code: Cell, workchain = 0) {
        const data = sbtConfigToCell(config);
        const init = { code, data };
        return new Sbt(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.transfer), 32).storeUint(queryId, 64).endCell(),
        });
    }

    async sendProveOwnership(provider: ContractProvider, via: Sender, value: bigint, dest: Address, forwardPayload: Cell, withContent: boolean) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.prove_ownership), 32)
                .storeUint(queryId, 64)
                .storeAddress(dest)
                .storeRef(forwardPayload)
                .storeInt(withContent ? -1 : 0, 8)
                .endCell(),
        });
    }

    async sendGetStaticData(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.get_static_data), 32)
                .storeUint(queryId, 64)
                .endCell(),
        });
    }

    async sendRequestOwner(provider: ContractProvider, via: Sender, value: bigint, dest: Address, forwardPayload: Cell, withContent: boolean) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.request_owner), 32)
                .storeUint(queryId, 64)
                .storeAddress(dest)
                .storeRef(forwardPayload)
                .storeInt(withContent ? -1 : 0, 8)
                .endCell(),
        });
    }

    async sendDestroy(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.destroy), 32).storeUint(queryId, 64).endCell(),
        });
    }

    async sendRevoke(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.revoke), 32).storeUint(queryId, 64).endCell(),
        });
    }

    async sendTakeExcess(provider: ContractProvider, via: Sender, value: bigint) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opCodeToNum(OpCodes.take_excess), 32).storeUint(queryId, 64).endCell(),
        });
    }

    async sendChangeDescription(provider: ContractProvider, via: Sender, value: bigint, description: string) {
        return await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opCodeToNum(OpCodes.change_description), 32)
                .storeUint(queryId, 64)
                .storeRef(beginCell().storeUint(0,8).storeStringTail(description).endCell())
                .endCell(),
        });
    }

    async getNftData(provider: ContractProvider) {
        return await provider.get("get_nft_data", []);
    }

    async getAuthorityAddress(provider: ContractProvider) {
        const res = await provider.get("get_authority_address", []);
        return res.stack.readAddress().toString();
    }

    async getRevokedTime(provider: ContractProvider) {
        return await provider.get("get_revoked_time", []);
    }

    async getTelegramUserName(provider: ContractProvider) {
        const res = await provider.get('get_telegram_username', []);
        return res.stack.readString()
    }

    async getCohortNumber(provider: ContractProvider) {
        const res = await provider.get('get_cohort_number', []);
        return res.stack.readString();
    }
}