import { address, Cell, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { buildOnchainContent } from '../utils/onchainContent';

const randomSeed= Math.floor(Math.random() * 10000);

export async function run(provider: NetworkProvider) {
    const myAddress = provider.sender().address!!;

    const config = {
        ownerAddress: myAddress,
        nextItemIndex: 0,
        collectionContent: buildOnchainContent({
            image: 'http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg',
            name: 'SBTest',
            description: 'Collection test description. Random seed: ' + randomSeed,
        }),
        commonContent: Cell.EMPTY,
        nftItemCode: await compile('Sbt'),
        royaltyParams: {
            royaltyFactor: 0,
            royaltyBase: 0,
            royaltyAddress: myAddress
        }
    };
    const collection = provider.open(Collection.createFromConfig(config, await compile('Collection')));

    await collection.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(collection.address);

    await collection.sendDeploySbt(
        provider.sender(),
        {
            itemIndex: 0,
            itemOwnerAddress: address("0QCZy07U-c7-qH30s9mHbqD4N-IhAfSD7YgRda6-UeGu-jhQ"),
            itemAuthorityAddress: myAddress,
            itemContent: buildOnchainContent({
                name: "Test & Check SBT",
                description: "Editable description",
                image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
                telegram_username: "@testandcheck",
                cohort_number: "3",
            }),
            amount: toNano('0.05'),
            queryId: 0
        },
    );

    await collection.sendDeployBatchSbt(
        provider.sender(), {
            sbts: [
                {
                    itemIndex: 1,
                    itemOwnerAddress: randomAddress(),
                    itemAuthorityAddress: myAddress,
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
                    itemIndex: 2,
                    itemOwnerAddress: randomAddress(),
                    itemAuthorityAddress: myAddress,
                    itemContent: {
                        name: "Test & Check SBT",
                        description: "Editable description",
                        image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
                        telegram_username: "@secondUser",
                        cohort_number: "3",
                    },
                    amount: toNano('0.05'),
                }
            ]
        });

    // run methods on `collection`
}
