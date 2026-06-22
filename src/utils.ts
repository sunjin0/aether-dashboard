export const interceptCallback = (handler: any, callback: any) => (...args: any) => {
  handler(...args);
  return callback?.apply(null, args);
};
