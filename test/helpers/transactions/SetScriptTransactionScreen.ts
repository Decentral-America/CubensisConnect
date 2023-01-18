export const SetScriptTransactionScreen = {
  get root() {
    return browser.$("[class*='screen@']");
  },

  get contentScript() {
    return this.root.findByTestId$('contentScript');
  },

  get scriptTitle() {
    return this.root.findByTestId$('setScriptTitle');
  },
};
