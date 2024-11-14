import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Sbt, opCodeToNum } from '../wrappers/Sbt';
import { OpCodes } from '../wrappers/Sbt';
import { buildOnchainContent } from '../utils/onchainContent';

const metadata = {
    name: "TON dev study test SBT",
    description: "Editable description",
    image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
    telegram_username: "@deployer",
    cohort_number: "3",
}

describe('SBT', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Sbt');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<TreasuryContract>;
    let sbtOwner: SandboxContract<TreasuryContract>;
    let sbtAuthority: SandboxContract<TreasuryContract>;
    let sbt: SandboxContract<Sbt>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        collection = await blockchain.treasury('collection');
        sbtOwner = await blockchain.treasury('owner');
        sbtAuthority = await blockchain.treasury('authority');

        const config = {
            sbt_id: 1,
            collection_address: collection.address,
            sbt_owner_address: sbtOwner.address,
            authority_address: sbtAuthority.address,
            content: metadata,
            revoked_at: 0
        }

        sbt = blockchain.openContract(Sbt.createFromConfig(config, code));

        const deployResult = await sbt.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: sbt.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and collection are ready to use
    });

    it('should request owner', async () => {
        const dest: Address = deployer.address;
        const forwardPayload: Cell = beginCell().endCell();
        const withContent: boolean = true;
        const res = await sbt.sendRequestOwner(sbtOwner.getSender(), toNano('0.05'), dest, forwardPayload, withContent)

        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.request_owner),
            success: true
        });

        // TODO: check the body
        expect(res.transactions).toHaveTransaction({
            from: sbt.address,
            to: dest,
            op: opCodeToNum(OpCodes.owner_info),
            success: true
        });
    });

    it('should prove ownership', async () => {
        const dest: Address = deployer.address;
        const forwardPayload: Cell = beginCell().storeUint(32, 8).endCell();
        const withContent: boolean = false;
        const res = await sbt.sendProveOwnership(sbtOwner.getSender(), toNano('0.05'), dest, forwardPayload, withContent);

        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.prove_ownership),
            success: true
        });

        // TODO: check the body
        expect(res.transactions).toHaveTransaction({
            from: sbt.address,
            to: dest,
            op: opCodeToNum(OpCodes.ownership_proof),
            success: true
        });
    });

    it('should get static data', async () => {
        const res = await sbt.sendGetStaticData(deployer.getSender(), toNano('0.05'))

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.get_static_data),
            success: true
        });

        // TODO: check the body
        expect(res.transactions).toHaveTransaction({
            from: sbt.address,
            to: deployer.address,
            op: opCodeToNum(OpCodes.report_static_data),
            success: true,
        });
    });

    it('should destroy', async () => {
        const res = await sbt.sendDestroy(sbtOwner.getSender(), toNano('0.05'))

        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.destroy),
            success: true
        });

        // TODO: check nulled addresses
        expect(res.transactions).toHaveTransaction({
            from: sbt.address,
            to: sbtOwner.address,
            op: opCodeToNum(OpCodes.excesses),
            success: true
        });
    });

    it('should revoke', async () => {
        const res = await sbt.sendRevoke(sbtAuthority.getSender(), toNano('0.05'));

        expect(res.transactions).toHaveTransaction({
            from: sbtAuthority.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.revoke),
            success: true
        });

        const revokedTimeRes = await sbt.getRevokedTime();
        expect(revokedTimeRes.stack.readBigNumber()).toBeGreaterThan(0n);

    });

    it('should take excess', async () => {
        const res = await sbt.sendTakeExcess(sbtOwner.getSender(), toNano('0.05'))

        expect(res.transactions).toHaveTransaction({
            from: sbtOwner.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.take_excess),
            success: true
        });

        expect(res.transactions).toHaveTransaction({
            from: sbt.address,
            to: sbtOwner.address,
            op: opCodeToNum(OpCodes.excesses),
            success: true
        });

        // TODO: check excesses amount
    });

    it('should change description', async () => {
        const description = "New edited description";

        const res = await sbt.sendChangeDescription(sbtAuthority.getSender(), toNano('0.05'), description);
        expect(res.transactions).toHaveTransaction({
            from: sbtAuthority.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.change_description),
            success: true,
        });

        let newMetadata = { ...metadata };
        newMetadata.description = description;

        const nftData = await sbt.getNftData();
        expect(nftData.stack.readNumber()).toEqual(-1)
        expect(nftData.stack.readNumber()).toEqual(1)
        expect(nftData.stack.readAddress().toString()).toEqual(collection.address.toString())
        expect(nftData.stack.readAddress().toString()).toEqual(sbtOwner.address.toString())
        const content = nftData.stack.readCell()
        expect(content).toEqualCell(buildOnchainContent(newMetadata))
    });

    it('shouldn not transfer', async () => {
        const res = await sbt.sendTransfer(deployer.getSender(), toNano('0.05'));
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: sbt.address,
            op: opCodeToNum(OpCodes.transfer),
            success: false,
            exitCode: 403,
        });
    });

    it('should get sbt data', async () => {
        const res = await sbt.getNftData();
        expect(res.stack.readNumber()).toEqual(-1)
        expect(res.stack.readNumber()).toEqual(1)
        expect(res.stack.readAddress().toString()).toEqual(collection.address.toString())
        expect(res.stack.readAddress().toString()).toEqual(sbtOwner.address.toString())
        expect(res.stack.readCell()).toEqualCell(buildOnchainContent(metadata))
    });

    it('should get authority address', async () => {
        const res = await sbt.getAuthorityAddress();
        expect(res).toEqual(sbtAuthority.address.toString());
    });

    it('should get telegram username', async () => {
        const res = await sbt.getTelegramUserName();
        expect(res).toEqual(metadata.telegram_username);
    });

    it('should get cohort number', async () => {
        const res = await sbt.getCohortNumber();
        expect(res).toEqual(metadata.cohort_number);
    });
});