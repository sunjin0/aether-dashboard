/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(initialState:any) {
  const { currentUser } = initialState ?? {};
  return currentUser&&currentUser.permissionMap||[];
}
