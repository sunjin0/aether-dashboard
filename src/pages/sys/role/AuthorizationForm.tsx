import {ProForm} from "@ant-design/pro-components";
import React, {useState} from "react";
import DrawerForm from "@/components/DrawerForm";
import {Form, message, Tree} from "antd";
import {useIntl} from "@umijs/max";
import {getResourceList, getRoleAuthorization, saveRoleAuthorization} from "@/services/sys/RoleController";


const removeParentSelected = (resources: Array<any>, checkedResources: Array<string>,
                              halfCheckedResources: Array<string>) => {
  for (const resource of resources) {
    // 有子节点直接移除
    if (resource.children && resource.children.length > 0) {
      const index = checkedResources.indexOf(resource.id);
      if (index >= 0) {
        const x = checkedResources.splice(index, 1);
        halfCheckedResources.push(...x);
      }
      removeParentSelected(resource.children, checkedResources, halfCheckedResources);
    }
  }
};
const AuthorizationForm = (props: {
  id: any;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void
}) => {
  const {id, open, setOpen, onSuccess} = props
  const [form] = Form.useForm()
  const intl = useIntl()
  const [resourceIds, setResourceIds] = useState<any[]>([])
  const [checkedKeys, setCheckedKeys] = useState<any[]>([])
  const [halfCheckedKeys, setHalfCheckedKeys] = useState<any[]>([])
  return (
    <DrawerForm
      open={open}
      setOpen={setOpen}
      id={id}
      request={async (params) => {
        const info = async () => {
          const resourceList = await getResourceList();
          let resources = resourceList.data;
          if (id) {
            const promise = await getRoleAuthorization({id});
            const halfCheckedResources: Array<string> = [];
            setResourceIds(resources)
            removeParentSelected(resources, promise.data, halfCheckedResources)
            setCheckedKeys(promise.data)
            setHalfCheckedKeys(halfCheckedResources)
          } else {
            setResourceIds(resources)
          }
        }
        await info()
      }}
      onSuccess={async () => {
        const {code, message: msg} = await saveRoleAuthorization({
          id,
          resourceIds: [...checkedKeys, ...halfCheckedKeys]
        })
        if (code !== 200) {
          message.error(msg)
          return false
        }
        message.success(msg)
        onSuccess()
        return true
      }}
      form={form}>
      <ProForm.Item
        name="resourceIds"
        valuePropName="resourceIds"
        label={intl.formatMessage({id: 'pages.sys.resource.name'})}
        rules={[
          {
            required: true,
            validator: async () => {
              if (checkedKeys.length === 0) {
                return Promise.reject(new Error(intl.formatMessage({id: 'pages.sys.resource.required'})))
              } else {
                return Promise.resolve()
              }
            }
          },
        ]}
      >
        <Tree
          checkable
          treeData={resourceIds}
          checkedKeys={checkedKeys}
          onCheck={(check: any, info: any) => {
            //如果写入权限被选中，则自动选中父节点
            if (info.node.type === "Resource_Type_Permission" && info.node.name === "Write" && info.checked) {
              setCheckedKeys([...check, info.node.parentId + "", info.node.key])
            } else {
              setCheckedKeys(check)
            }
            setHalfCheckedKeys(info.halfCheckedKeys)
          }}
        />
      </ProForm.Item>
    </DrawerForm>
  )
}
export default AuthorizationForm
