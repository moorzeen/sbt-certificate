import { Address, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import { NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const collectionAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('Enter SBT collection address:'));

    const sbtCollection = provider.open(Collection.createFromAddress(collectionAddress));
    const myAddress = provider.sender().address!!;

    await sbtCollection.sendDeployBatchSbt(
        provider.sender(), {
            sbts: [
                {
                    itemIndex: 3,
                    itemOwnerAddress: randomAddress(),
                    itemAuthorityAddress: myAddress,
                    itemContent: {
                        name: 'Test & Check SBT',
                        description: 'Editable description',
                        image: 'http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg',
                        telegram_username: '@User5',
                        cohort_number: '3',
                    },
                    amount: toNano('0.05'),
                },
                {
                    itemIndex: 4,
                    itemOwnerAddress: randomAddress(),
                    itemAuthorityAddress: myAddress,
                    itemContent: {
                        name: "Test & Check SBT",
                        description: "Editable description",
                        image: "http://49.13.231.202/gateway/923757C28DD60639F7ABE4A4B9019D5665555642BDC198B91C36790E486DCA4E/Diamond-dimd15a.jpg",
                        telegram_username: "@user5",
                        cohort_number: "3",
                    },
                    amount: toNano('0.05'),
                }
            ]
        });

    ui.write(`SBT items deployed at collection https://testnet.tonviewer.com/${sbtCollection.address}`);

    // run methods on `sbt`
}
