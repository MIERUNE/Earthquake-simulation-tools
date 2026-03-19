import { Construct } from 'constructs';

export const getProfile = (stack: Construct): any => {
  // --context stage=xxx が指定されてなかったらデフォルト値 develop にする
  const profileStr = stack.node.tryGetContext('stage') ?? 'develop';
  const profile = stack.node.tryGetContext(profileStr);
  if (!profile) {
    throw new Error(`profile=${profileStr} の環境設定が取得できませんでした。`);
  }
  return profile;
};
