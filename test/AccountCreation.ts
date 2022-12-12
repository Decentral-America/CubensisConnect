import { expect } from 'expect-webdriverio';
import waitForExpect from 'wait-for-expect';

import { AccountInfoScreen } from './pageobject/AccountInfoScreen';
import { BackupSeedScreen } from './pageobject/BackupSeedScreen';
import { ChooseAccountsForm } from './pageobject/ChooseAccountsForm';
import { Common } from './pageobject/Common';
import { ConfirmBackupScreen } from './pageobject/ConfirmBackupScreen';
import { DeleteAccountScreen } from './pageobject/DeleteAccountScreen';
import { EmptyHomeScreen } from './pageobject/EmptyHomeScreen';
import { HomeScreen } from './pageobject/HomeScreen';
import { ImportFormScreen } from './pageobject/ImportFormScreen';
import { ImportKeystoreFileScreen } from './pageobject/ImportKeystoreFileScreen';
import { ImportSuccessScreen } from './pageobject/ImportSuccessScreen';
import { ImportUsingSeedScreen } from './pageobject/ImportUsingSeedScreen';
import { NewWalletNameScreen } from './pageobject/NewWalletNameScreen';
import { NewWalletScreen } from './pageobject/NewWalletScreen';
import { OtherAccountsScreen } from './pageobject/OtherAccountsScreen';
import {
  AccountsHome,
  App,
  Network,
  PopupHome,
  Settings,
  Windows,
} from './utils/actions';

describe('Account creation', function () {
  this.timeout(60 * 1000);

  let tabKeeper: string, tabAccounts: string;

  async function deleteEachAndSwitchToAccounts() {
    while (!(await EmptyHomeScreen.isDisplayed())) {
      await HomeScreen.activeAccountCard.click();
      await AccountInfoScreen.deleteAccountButton.click();
      await DeleteAccountScreen.deleteAccountButton.click();
    }

    await EmptyHomeScreen.root.waitForExist();
    await browser.switchToWindow(tabAccounts);
  }

  before(async () => {
    await App.initVault();
    await Settings.setMaxSessionTimeout();
    await browser.openKeeperPopup();
    tabKeeper = await browser.getWindowHandle();

    const { waitForNewWindows } = await Windows.captureNewWindows();
    await EmptyHomeScreen.addButton.click();
    [tabAccounts] = await waitForNewWindows(1);
    await browser.switchToWindow(tabAccounts);
    await browser.refresh();
  });

  after(async () => {
    await browser.switchToWindow(tabAccounts);
    await browser.closeWindow();
    await browser.switchToWindow(tabKeeper);
    await App.resetVault();
  });

  describe('Create', () => {
    const ACCOUNTS = {
      FIRST: 'first',
      SECOND: 'second',
      ANY: 'account123!@#_аккаунт',
    };

    after(deleteEachAndSwitchToAccounts);

    it('first account via "Create a new account"', async () => {
      await ImportFormScreen.createNewAccountButton.click();
      await NewWalletScreen.continueButton.click();

      const seed = await BackupSeedScreen.seedField.getText();
      await BackupSeedScreen.continueButton.click();

      for (const word of seed.split(' ')) {
        const pill =
          await ConfirmBackupScreen.suggestedPillsContainer.getPillByText(word);
        await pill.click();
        await waitForExpect(async () => {
          expect(await pill.isDisplayed()).toBe(false);
        });
      }

      await ConfirmBackupScreen.confirmButton.click();
      await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.FIRST);
      await NewWalletNameScreen.continueButton.click();

      await ImportSuccessScreen.addAnotherAccountButton.click();
      await browser.switchToWindow(tabKeeper);
      expect(await HomeScreen.activeAccountNameField.getText()).toBe(
        ACCOUNTS.FIRST
      );
    });

    describe('additional account via "Add account"', () => {
      describe('When you already have 1 account', () => {
        describe('Create new account page', () => {
          before(async () => {
            await HomeScreen.otherAccountsButton.click();
            await OtherAccountsScreen.addAccountButton.click();
            await browser.switchToWindow(tabAccounts);
            await ImportFormScreen.createNewAccountButton.click();
          });

          it('Each time you open the "Create new account" screen, new addresses are generated', async () => {
            const prevAddress =
              await NewWalletScreen.accountAddressField.getText();
            await Common.backButton.click();

            await ImportFormScreen.createNewAccountButton.click();
            const newAddress =
              await NewWalletScreen.accountAddressField.getText();
            expect(newAddress).not.toBe(prevAddress);
          });

          it('You can select any account from the list of 5 generated', async () => {
            const avatarList = await NewWalletScreen.avatars;

            expect(avatarList).toHaveLength(5);

            let prevAddress: string | null = null;

            for (const avatar of avatarList) {
              await avatar.click();
              const currentAddress =
                await NewWalletScreen.accountAddressField.getText();
              expect(currentAddress).not.toBe(prevAddress);
              prevAddress = currentAddress;
            }

            await NewWalletScreen.continueButton.click();
          });
        });

        let rightSeed: string;
        describe('Save backup phrase page', () => {
          it('Backup phrase is visible', async () => {
            rightSeed = await BackupSeedScreen.seedField.getText();
            expect(rightSeed.length).toBeGreaterThan(0);

            await BackupSeedScreen.continueButton.click();
          });

          it('Backup phrase cannot be selected with cursor');
          it('Ability to copy backup phrase to clipboard');
        });

        describe('Confirm backup page', () => {
          const PILLS_COUNT = 15;

          it('Filling in a seed in the wrong word order', async () => {
            // there is no Confirm button. An error message and a "Clear" button are displayed
            const wrongSeed = rightSeed.split(' ').reverse();

            const suggestedPills = ConfirmBackupScreen.suggestedPillsContainer;
            const selectedPills = ConfirmBackupScreen.selectedPillsContainer;
            for (const word of wrongSeed) {
              const pill = await suggestedPills.getPillByText(word);
              await pill.click();
              await waitForExpect(async () => {
                expect(await pill.isDisplayed()).toBe(false);
              });
            }

            await waitForExpect(async () => {
              expect(await ConfirmBackupScreen.errorMessage.getText()).toBe(
                'Wrong order, try again'
              );
            });

            expect(await selectedPills.getAllPills()).toHaveLength(PILLS_COUNT);
            expect(await suggestedPills.getAllPills()).toHaveLength(0);
          });

          it('The "Clear" button resets a completely filled phrase', async () => {
            await ConfirmBackupScreen.clearLink.click();
            expect(await ConfirmBackupScreen.errorMessage.isDisplayed()).toBe(
              false
            );

            const suggestedPills = ConfirmBackupScreen.suggestedPillsContainer;
            const selectedPills = ConfirmBackupScreen.selectedPillsContainer;

            await waitForExpect(async () => {
              expect(await selectedPills.getAllPills()).toHaveLength(0);
              expect(await suggestedPills.getAllPills()).toHaveLength(
                PILLS_COUNT
              );
            });
          });

          it('The word can be reset by clicking (any, not only the last)', async () => {
            const suggestedPillsContainer =
              ConfirmBackupScreen.suggestedPillsContainer;
            const selectedPillsContainer =
              ConfirmBackupScreen.selectedPillsContainer;

            for (const pill of await suggestedPillsContainer.getAllPills()) {
              await pill.click();
            }

            const pills = await selectedPillsContainer.getAllPills();
            expect(pills).toHaveLength(PILLS_COUNT);
            for (const pill of pills) {
              const prevPillsCount = (
                await selectedPillsContainer.getAllPills()
              ).length;
              await pill.click();

              await waitForExpect(async () => {
                expect(await selectedPillsContainer.getAllPills()).toHaveLength(
                  prevPillsCount - 1
                );
              });
            }

            expect(await selectedPillsContainer.getAllPills()).toHaveLength(0);
            expect(await suggestedPillsContainer.getAllPills()).toHaveLength(
              PILLS_COUNT
            );
          });

          it('Account name page opened while filling in the phrase in the correct order', async () => {
            const suggestedPillsContainer =
              ConfirmBackupScreen.suggestedPillsContainer;
            for (const word of rightSeed.split(' ')) {
              const pill = await suggestedPillsContainer.getPillByText(word);
              await pill.click();
              await pill.waitForExist({ reverse: false });
            }

            await ConfirmBackupScreen.confirmButton.click();
          });
        });

        describe('Account name page', () => {
          it('Account cannot be given a name that is already in use', async () => {
            await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.FIRST);
            await browser.keys('Tab');

            expect(await NewWalletNameScreen.errorField.getText()).toBe(
              'Name already exist'
            );
            expect(await NewWalletNameScreen.continueButton.isEnabled()).toBe(
              false
            );
          });

          it('Ability to paste account name from clipboard');

          it('In the account name, you can enter numbers, special characters and symbols from any layout', async () => {
            await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.ANY);
            await browser.keys('Tab');

            expect(
              await NewWalletNameScreen.errorField.getText()
            ).toBeExisting();
            expect(await NewWalletNameScreen.continueButton.isEnabled()).toBe(
              true
            );
          });

          it('Account successfully created and selected', async () => {
            await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.ANY);
            await NewWalletNameScreen.continueButton.click();

            await waitForExpect(async () => {
              expect(await ImportSuccessScreen.root.isDisplayed()).toBe(true);
            });

            await ImportSuccessScreen.addAnotherAccountButton.click();
            await ImportFormScreen.root.waitForExist();

            await browser.switchToWindow(tabKeeper);
            await browser.openKeeperPopup();

            expect(await PopupHome.getActiveAccountName()).toBe(ACCOUNTS.ANY);
          });
        });
      });

      it('When you already have 2 accounts');

      it('When you already have 10 accounts');
    });
  });

  describe('Import via seed', () => {
    const ACCOUNTS = {
      FIRST: { SEED: 'this is first account seed', NAME: 'first' },
      MORE_24_CHARS: {
        SEED: 'there is more than 24 characters',
        NAME: 'more than 24 characters',
      },
    };

    after(deleteEachAndSwitchToAccounts);

    it('first account via "Import account"', async () => {
      await ImportFormScreen.importBySeedButton.click();

      await ImportUsingSeedScreen.seedInput.setValue(ACCOUNTS.FIRST.SEED);
      await ImportUsingSeedScreen.importAccountButton.click();

      await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.FIRST.NAME);
      await NewWalletNameScreen.continueButton.click();

      expect(ImportSuccessScreen.root).toBeDisplayed();
      await ImportSuccessScreen.addAnotherAccountButton.click();
      expect(ImportFormScreen.root).toBeDisplayed();

      await browser.switchToWindow(tabKeeper);
      await browser.openKeeperPopup();

      expect(await PopupHome.getActiveAccountName()).toBe(ACCOUNTS.FIRST.NAME);
    });

    describe('additional account via the "Add account"', () => {
      describe('When you already have 1 account', () => {
        before(async () => {
          await PopupHome.addAccount();
          await browser.switchToWindow(tabAccounts);
          await ImportFormScreen.importBySeedButton.click();
        });

        describe('Seed phrase page', () => {
          it("Can't import seed with length less than 24 characters", async () => {
            await ImportUsingSeedScreen.seedInput.setValue('too short seed');
            await ImportUsingSeedScreen.importAccountButton.click();

            expect(ImportUsingSeedScreen.errorMessage).toHaveText(
              'Seed cannot be shorter than 24 characters'
            );
          });

          it('Can be switched to existing account', async () => {
            await ImportUsingSeedScreen.seedInput.setValue(ACCOUNTS.FIRST.SEED);
            expect(ImportUsingSeedScreen.switchAccountButton).toBeDisplayed();
            expect(ImportUsingSeedScreen.errorMessage).toHaveTextContaining(
              'Account already known as'
            );
          });

          it('Any change in the seed changes the address', async () => {
            await ImportUsingSeedScreen.seedInput.setValue(
              ACCOUNTS.MORE_24_CHARS.SEED
            );

            let prevAddress =
              await ImportUsingSeedScreen.addressField.getText();

            // insert char
            await ImportUsingSeedScreen.seedInput.addValue('W');
            expect(ImportUsingSeedScreen.addressField).not.toHaveText(
              prevAddress
            );
            prevAddress = await ImportUsingSeedScreen.addressField.getText();

            // delete inserted char
            await browser.keys('Backspace');
            expect(ImportUsingSeedScreen.addressField).not.toHaveText(
              prevAddress
            );
          });

          it('You can paste a seed from the clipboard');

          it('Correct seed entered', async () => {
            await ImportUsingSeedScreen.seedInput.setValue(
              ACCOUNTS.MORE_24_CHARS.SEED
            );
            await ImportUsingSeedScreen.importAccountButton.click();
          });
        });

        describe('Account name page', () => {
          it('The account cannot be given a name already in use', async () => {
            await NewWalletNameScreen.nameInput.setValue(ACCOUNTS.FIRST.NAME);
            await browser.keys('Tab');

            expect(NewWalletNameScreen.errorField).toHaveText(
              'name already exist'
            );
            expect(NewWalletNameScreen.continueButton).toBeDisabled();
          });

          it('Additional account successfully imported while entered correct account name', async () => {
            await NewWalletNameScreen.nameInput.setValue(
              ACCOUNTS.MORE_24_CHARS.NAME
            );
            await browser.keys('Tab');

            expect(NewWalletNameScreen.errorField).toHaveText('');

            await NewWalletNameScreen.continueButton.click();

            await ImportSuccessScreen.addAnotherAccountButton.click();
            expect(ImportFormScreen.root).toBeExisting();

            await browser.switchToWindow(tabKeeper);
            await browser.openKeeperPopup();

            expect(HomeScreen.activeAccountNameField).toHaveText(
              ACCOUNTS.MORE_24_CHARS.NAME
            );
            7;
          });
        });
      });

      it('When you already have 2 accounts');
      it('When you already have 10 accounts');
    });
  });

  describe('Import via keystore file', () => {
    describe('validation', () => {
      it(
        'keeps "Continue" button disabled until both keystore file is selected and password is entered'
      );
    });

    describe('file parsing and decryption', () => {
      beforeEach(async () => {
        await ImportFormScreen.importByKeystoreFileButton.click();
      });

      afterEach(async () => {
        await Common.backButton.click();
      });

      async function extractParsedAccountsFromDOM() {
        const accountsGroups = await ChooseAccountsForm.accountsGroups;
        return await Promise.all(
          accountsGroups.map(async group => {
            const accountCards = await group.accounts;
            return {
              label: await group.label.getText(),
              accounts: await Promise.all(
                accountCards.map(async account => ({
                  name: await account.nameField.getText(),
                  address: await account.getAddress(),
                }))
              ),
            };
          })
        );
      }

      it('can decrypt the correct keeper keystore file', async () => {
        await ImportKeystoreFileScreen.fileInput.addValue(
          '/app/test/fixtures/keystore-keeper.json'
        );
        await ImportKeystoreFileScreen.passwordInput.setValue(
          'xHZ7Zaxu2wuncWC'
        );
        await ImportKeystoreFileScreen.continueButton.click();

        expect(await extractParsedAccountsFromDOM()).toStrictEqual([
          {
            label: 'Mainnet',
            accounts: [
              { name: 'test2', address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r' },
            ],
          },
          {
            label: 'Testnet',
            accounts: [
              { name: 'test', address: '3Mxpw1i3ZP6TbiuMU1qUdv6vSBoSvkCfQ8h' },
              { name: 'test3', address: '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi' },
            ],
          },
          {
            label: 'Stagenet',
            accounts: [
              { name: 'test4', address: '3MWxaD2xCMBUHnKkLJUqH3xFca2ak8wdd6D' },
            ],
          },
        ]);
      });

      it('can decrypt the correct exchange keystore file', async () => {
        await ImportKeystoreFileScreen.fileInput.addValue(
          '/app/test/fixtures/keystore-exchange.json'
        );
        await ImportKeystoreFileScreen.passwordInput.setValue(
          'N72r78ByXBfNBnN#'
        );
        await ImportKeystoreFileScreen.continueButton.click();

        expect(await extractParsedAccountsFromDOM()).toStrictEqual([
          {
            label: 'Mainnet',
            accounts: [
              { name: 'test', address: '3PAqjy2wRWdrEBCmj66UbNUjo5KDksk9rTA' },
              { name: 'test2', address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r' },
            ],
          },
        ]);
      });

      it('shows an error if the file format is not recognized');
      it('shows an error if the password is wrong');
    });

    describe('actual import', () => {
      async function extractAccountCheckboxesFromDOM() {
        const accounts = await ChooseAccountsForm.accounts;
        return await Promise.all(
          accounts.map(async account => ({
            name: await account.nameField.getText(),
            address: await account.getAddress(),
            selected: await account.isSelected(),
          }))
        );
      }

      async function collectAllAccountNames() {
        const activeAccountName =
          await HomeScreen.activeAccountNameField.getText();
        await HomeScreen.otherAccountsButton.click();
        const otherAccountNames = await Promise.all(
          (
            await OtherAccountsScreen.accounts
          ).map(async it => await it.nameField.getText())
        );
        await Common.backButton.click();
        return [activeAccountName, ...otherAccountNames];
      }

      describe('when no accounts exist', () => {
        it('allows to select and import all accounts', async () => {
          await ImportFormScreen.importByKeystoreFileButton.click();
          await ImportKeystoreFileScreen.fileInput.addValue(
            '/app/test/fixtures/keystore-keeper.json'
          );
          await ImportKeystoreFileScreen.passwordInput.setValue(
            'xHZ7Zaxu2wuncWC'
          );
          await ImportKeystoreFileScreen.continueButton.click();

          expect(await extractAccountCheckboxesFromDOM()).toStrictEqual([
            {
              name: 'test2',
              address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
              selected: true,
            },
            {
              name: 'test',
              address: '3Mxpw1i3ZP6TbiuMU1qUdv6vSBoSvkCfQ8h',
              selected: true,
            },
            {
              name: 'test3',
              address: '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi',
              selected: true,
            },
            {
              name: 'test4',
              address: '3MWxaD2xCMBUHnKkLJUqH3xFca2ak8wdd6D',
              selected: true,
            },
          ]);

          (
            await ChooseAccountsForm.getAccountByAddress(
              '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi'
            )
          ).checkbox.click();
          (
            await ChooseAccountsForm.getAccountByAddress(
              '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r'
            )
          ).checkbox.click();

          expect(await extractAccountCheckboxesFromDOM()).toStrictEqual([
            {
              name: 'test2',
              address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
              selected: false,
            },
            {
              name: 'test',
              address: '3Mxpw1i3ZP6TbiuMU1qUdv6vSBoSvkCfQ8h',
              selected: true,
            },
            {
              name: 'test3',
              address: '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi',
              selected: false,
            },
            {
              name: 'test4',
              address: '3MWxaD2xCMBUHnKkLJUqH3xFca2ak8wdd6D',
              selected: true,
            },
          ]);

          await ChooseAccountsForm.importButton.click();
          await ImportSuccessScreen.addAnotherAccountButton.click();

          await browser.switchToWindow(tabKeeper);
          await Network.switchToAndCheck('Testnet');

          expect(await collectAllAccountNames()).toStrictEqual(['test']);

          await Network.switchToAndCheck('Stagenet');

          expect(await collectAllAccountNames()).toStrictEqual(['test4']);
        });
      });

      describe('when some, but not all accounts already exist', () => {
        it('allows to select only unexisting accounts', async () => {
          await PopupHome.addAccount();

          await browser.switchToWindow(tabAccounts);
          await ImportFormScreen.importByKeystoreFileButton.click();
          await ImportKeystoreFileScreen.fileInput.addValue(
            '/app/test/fixtures/keystore-keeper.json'
          );
          await ImportKeystoreFileScreen.passwordInput.setValue(
            'xHZ7Zaxu2wuncWC'
          );
          await ImportKeystoreFileScreen.continueButton.click();

          expect(await extractAccountCheckboxesFromDOM()).toStrictEqual([
            {
              name: 'test2',
              address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
              selected: true,
            },
            {
              name: 'test',
              address: '3Mxpw1i3ZP6TbiuMU1qUdv6vSBoSvkCfQ8h',
              selected: null,
            },
            {
              name: 'test3',
              address: '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi',
              selected: true,
            },
            {
              name: 'test4',
              address: '3MWxaD2xCMBUHnKkLJUqH3xFca2ak8wdd6D',
              selected: null,
            },
          ]);

          await ChooseAccountsForm.importButton.click();
          await ImportSuccessScreen.addAnotherAccountButton.click();

          await browser.switchToWindow(tabKeeper);
          await browser.openKeeperPopup();
          await Network.switchToAndCheck('Testnet');

          expect(await collectAllAccountNames()).toStrictEqual([
            'test',
            'test3',
          ]);

          await Network.switchToAndCheck('Stagenet');

          expect(await collectAllAccountNames()).toStrictEqual(['test4']);

          await Network.switchToAndCheck('Mainnet');

          expect(await collectAllAccountNames()).toStrictEqual(['test2']);
        });
      });

      describe('when all accounts exist', () => {
        it('does not allow selecting anything and shows the "Skip" button', async () => {
          await PopupHome.addAccount();

          await browser.switchToWindow(tabAccounts);
          await ImportFormScreen.importByKeystoreFileButton.click();
          await ImportKeystoreFileScreen.fileInput.addValue(
            '/app/test/fixtures/keystore-keeper.json'
          );
          await ImportKeystoreFileScreen.passwordInput.setValue(
            'xHZ7Zaxu2wuncWC'
          );
          await ImportKeystoreFileScreen.continueButton.click();

          expect(await extractAccountCheckboxesFromDOM()).toStrictEqual([
            {
              name: 'test2',
              address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
              selected: null,
            },
            {
              name: 'test',
              address: '3Mxpw1i3ZP6TbiuMU1qUdv6vSBoSvkCfQ8h',
              selected: null,
            },
            {
              name: 'test3',
              address: '3Mxpfxhrwyn4ynCi7WpogBQ8ccP2iD86jNi',
              selected: null,
            },
            {
              name: 'test4',
              address: '3MWxaD2xCMBUHnKkLJUqH3xFca2ak8wdd6D',
              selected: null,
            },
          ]);

          await ChooseAccountsForm.skipButton.click();
          await ImportFormScreen.root.waitForDisplayed();
        });
      });

      describe('when the user already has an account with the same name, but different address', () => {
        before(async () => {
          await browser.switchToWindow(tabKeeper);
        });

        beforeEach(deleteEachAndSwitchToAccounts);

        it('adds suffix to the name', async () => {
          await AccountsHome.importAccount(
            'test2',
            'this is the seed for the test account'
          );

          await ImportFormScreen.importByKeystoreFileButton.click();
          await ImportKeystoreFileScreen.fileInput.addValue(
            '/app/test/fixtures/keystore-keeper.json'
          );
          await ImportKeystoreFileScreen.passwordInput.setValue(
            'xHZ7Zaxu2wuncWC'
          );
          await ImportKeystoreFileScreen.continueButton.click();

          expect(await extractAccountCheckboxesFromDOM()).toContainEqual({
            name: 'test2 (1)',
            address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
            selected: true,
          });

          await ChooseAccountsForm.importButton.click();
          await ImportSuccessScreen.addAnotherAccountButton.click();

          await browser.switchToWindow(tabKeeper);
          await browser.openKeeperPopup();

          expect(await collectAllAccountNames()).toStrictEqual([
            'test2',
            'test2 (1)',
          ]);
        });

        it('increments the number in suffix if it already exists', async () => {
          await AccountsHome.importAccount(
            'test2',
            'this is a seed for the test account'
          );

          await AccountsHome.importAccount(
            'test2 (1)',
            'this is an another seed for the test account'
          );

          await ImportFormScreen.importByKeystoreFileButton.click();
          await ImportKeystoreFileScreen.fileInput.addValue(
            '/app/test/fixtures/keystore-keeper.json'
          );
          await ImportKeystoreFileScreen.passwordInput.setValue(
            'xHZ7Zaxu2wuncWC'
          );
          await ImportKeystoreFileScreen.continueButton.click();

          expect(await extractAccountCheckboxesFromDOM()).toContainEqual({
            name: 'test2 (2)',
            address: '3PCj4z3TZ1jqZ7A9zYBoSbHnvRqFq2uy89r',
            selected: true,
          });

          await ChooseAccountsForm.importButton.click();
          await ImportSuccessScreen.addAnotherAccountButton.click();

          await browser.switchToWindow(tabKeeper);
          await browser.openKeeperPopup();

          const accountNames = await collectAllAccountNames();
          ['test2 (1)', 'test2', 'test2 (2)'].forEach(name => {
            expect(accountNames).toContainEqual(name);
          });
        });
      });
    });
  });
});
