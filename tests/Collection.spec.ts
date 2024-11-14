import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import '@ton/test-utils';
import { Sbt } from '../wrappers/Sbt';
import { compile } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { buildOnchainContent } from '../utils/onchainContent';

const nftMetadata = {
    name: "Test & Check SBT",
    description: "Editable description",
    image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
    telegram_username: "@testandcheck",
    cohort_number: "3",
}

describe('Collection', () => {
    let code: Cell;
    let itemCode: Cell;

    beforeAll(async () => {
        code = await compile('Collection');
        itemCode = await compile('Sbt');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let sbtOwner: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<Collection>;
    let sbtAuthority: SandboxContract<TreasuryContract>;
    let sbt: SandboxContract<Sbt>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sbtOwner = await blockchain.treasury('owner');
        sbtAuthority = await blockchain.treasury('authority');

        const data = {
            ownerAddress: deployer.address,
            nextItemIndex: 0,
            collectionContent: beginCell().storeStringRefTail("some collection content").endCell(),
            commonContent: beginCell().storeStringRefTail("some common content").endCell(),
            nftItemCode: itemCode,
            // TODO: delete royalty stuff?
            royaltyParams: {
                royaltyFactor: 0,
                royaltyBase: 0,
                royaltyAddress: deployer.address,
            },
        }

        collection = blockchain.openContract(Collection.createFromConfig(data, code));

        const deployResult = await collection.sendDeploy(deployer.getSender(), toNano('1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: collection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and collection are ready to use
    });

    it('should get collection data', async () => {
        const res = await collection.getCollectionData();
        expect(res.stack.readNumber()).toBe(0);
        expect(res.stack.readCell()).toEqualCell(beginCell().storeStringRefTail("some collection content").endCell());
        expect(res.stack.readAddress()).toEqualAddress(deployer.address);
    });

    it('should get sbt address', async () => {
        const res = await collection.getSbtAddressByIndex(0n);
        console.log(res.stack.readAddress());
        // TODO: compare with calculated address
    });

    it('should get royalty params', async () => {
        const res = await collection.getRoyaltyParams();
        expect(res.stack.readNumber()).toBe(0);
        expect(res.stack.readNumber()).toBe(0);
        expect(res.stack.readAddress()).toEqualAddress(deployer.address);
    });

    it('should get sbt content', async () => {
        const content = buildOnchainContent(nftMetadata)
        const res = await collection.getSbtContent(0n, content);
        expect(res.stack.readCell()).toEqualCell(content)

    });

    it('should get second owner', async () => {
        const res = await collection.getSecondOwner();
        expect(res.stack.readAddress()).toEqualAddress(deployer.address);
        // TODO: check case when second owner is set
    });

    it('should deploy sbt', async () => {
        const deploySbtRes = await collection.sendDeploySbt(
            deployer.getSender(),
            {
                itemIndex: 0,
                itemOwnerAddress: sbtOwner.address,
                itemAuthorityAddress: sbtAuthority.address,
                itemContent: buildOnchainContent(nftMetadata),
                amount: toNano('0.05'),
                queryId: 0
            },
        );

        const sbtAddressByIndex = await collection.getSbtAddressByIndex(0n);
        const sbtAddress = sbtAddressByIndex.stack.readCell().beginParse().loadAddress();
        expect(deploySbtRes.transactions).toHaveTransaction({
            from: collection.address,
            to: sbtAddress,
            value: toNano('0.05'),
            deploy: true,
            success: true,
        });

        sbt = blockchain.openContract(Sbt.createFromAddress(sbtAddress));

        const resNftData = await sbt.getNftData();
        expect(resNftData.stack.readNumber()).toEqual(-1)
        expect(resNftData.stack.readNumber()).toEqual(0)
        expect(resNftData.stack.readAddress().toString()).toEqual(collection.address.toString())
        expect(resNftData.stack.readAddress().toString()).toEqual(sbtOwner.address.toString())
        expect(resNftData.stack.readCell()).toEqualCell(buildOnchainContent(nftMetadata))

        const resUsername = await sbt.getTelegramUserName();
        expect(resUsername).toEqual(nftMetadata.telegram_username);

        const resCohort = await sbt.getCohortNumber();
        expect(resCohort).toEqual(nftMetadata.cohort_number);

        const revokedTimeRes = await sbt.getRevokedTime();
        expect(revokedTimeRes.stack.readBigNumber()).toEqual(0n);
    });

    it('should batch deploy', async () => {
        const firstUser = randomAddress();
        const secondUser = randomAddress();
        const deployBatchSbtRes = await collection.sendDeployBatchSbt(deployer.getSender(), {
            sbts: [
                {
                    itemIndex: 0,
                    itemOwnerAddress: firstUser,
                    itemAuthorityAddress: sbtAuthority.address,
                    itemContent: {
                        name: 'Test & Check SBT',
                        description: 'Editable description',
                        image: 'http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg',
                        telegram_username: '@firstUser',
                        cohort_number: '3',
                    },
                    amount: toNano('0.05'),
                },
                {
                    itemIndex: 1,
                    itemOwnerAddress: secondUser,
                    itemAuthorityAddress: sbtAuthority.address,
                    itemContent: {
                        name: "Test & Check SBT",
                        description: "Editable description",
                        image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
                        telegram_username: "@secondUser",
                        cohort_number: "3",
                    },
                    amount: toNano('0.05'),
                },
            ],
        });

        const sbtOne = await collection.getSbtAddressByIndex(0n);
        const sbtOneAddress = sbtOne.stack.readCell().beginParse().loadAddress();
        expect(deployBatchSbtRes.transactions).toHaveTransaction({
            from: collection.address,
            to: sbtOneAddress,
            value: toNano('0.05'),
            deploy: true,
            success: true,
        });
        const sbtOneContract = blockchain.openContract(Sbt.createFromAddress(sbtOneAddress));
        const usernameOne = await sbtOneContract.getTelegramUserName();
        expect(usernameOne).toEqual('@firstUser');

        const sbtTwo = await collection.getSbtAddressByIndex(1n);
        const sbtTwoAddress = sbtTwo.stack.readCell().beginParse().loadAddress();
        expect(deployBatchSbtRes.transactions).toHaveTransaction({
            from: collection.address,
            to: sbtTwoAddress,
            value: toNano('0.05'),
            deploy: true,
            success: true,
        });
        const sbtTwoContract = blockchain.openContract(Sbt.createFromAddress(sbtTwoAddress));
        const usernameTwo = await sbtTwoContract.getTelegramUserName();
        expect(usernameTwo).toEqual('@secondUser');
    });

});
