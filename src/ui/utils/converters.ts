import { Money } from '@waves/data-entities';
import { BigNumber } from '@waves/bignumber';

export const moneyLikeToMoney = (amount: IMoneyLike, assets): Money => {
  if (amount) {
    let amountResult = new Money(0, assets[amount.assetId || 'DCC']);

    if ('tokens' in amount) {
      amountResult = amountResult.cloneWithTokens(amount.tokens || 0);
    }

    if ('coins' in amount) {
      amountResult = amountResult.add(
        amountResult.cloneWithCoins(amount.coins || 0)
      );
    }

    return amountResult;
  }
};

export const getMoney = (
  amount: IMoneyLike | BigNumber | Money | string | number,
  assets
) => {
  if (amount instanceof Money) {
    return amount;
  }

  if (amount instanceof BigNumber) {
    return new Money(amount, assets['DCC']);
  }

  if (typeof amount === 'object') {
    if (amount.tokens != null || amount.coins != null) {
      return moneyLikeToMoney(amount, assets);
    }

    return new Money(
      (amount as { amount?: number | string }).amount || 0,
      assets[amount.assetId || 'DCC']
    );
  }

  return new Money(new BigNumber(amount), assets['DCC']);
};

export interface IMoneyLike {
  coins?: number | string | BigNumber;
  tokens?: number | string | BigNumber;
  assetId: string;
}
