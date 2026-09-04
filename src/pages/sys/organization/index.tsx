import { PageContainer, ProTable, StatisticCard } from '@ant-design/pro-components';
import {
  ApartmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
} from 'antd';
import { Graph } from '@antv/g6';
import { useIntl } from '@umijs/max';
import React, { useEffect, useRef, useState } from 'react';
import {
  assignOrganizationMember,
  assignTeamMember,
  createPlatformOrganization,
  createPlatformTeam,
  deletePlatformOrganization,
  deletePlatformTeam,
  listPlatformMembers,
  listPlatformOrganizations,
  listPlatformTeams,
  listPlatformTeamMembers,
  listPlatformUserOptions,
  removeOrganizationMember,
  removeTeamMember,
  updatePlatformOrganization,
  updatePlatformTeam,
} from '@/services/organization/PlatformOrganizationController';

type Action =
  | 'organization'
  | 'organizationEdit'
  | 'department'
  | 'departmentEdit'
  | 'member'
  | 'teamMember';
type Organization = {
  id: string;
  name: string;
  code?: string;
  teamCount?: number;
  memberCount?: number;
};
type Team = { id: string; name: string; code?: string };
const ORGANIZATION_MEMBER_ROLE = 'MEMBER';
const DEPARTMENT_ROLE_OPTIONS = ['DEPARTMENT_ADMIN', 'MEMBER', 'READ_ONLY'];

const roleLabel = (role: string, intl: any) =>
  intl.formatMessage(
    { id: `pages.organization.architecture.role.${role}` },
    { defaultMessage: role },
  );

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>\"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ||
      character,
  );

export default function PlatformOrganizationPage() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const orgRef = useRef<any>();
  const teamRef = useRef<any>();
  const memberRef = useRef<any>();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [architectureData, setArchitectureData] = useState<any>({ nodes: [], edges: [] });
  const [summary, setSummary] = useState({ departments: 0, members: 0 });
  const [organizationId, setOrganizationId] = useState<string>();
  const [teamId, setTeamId] = useState<string>();
  const [action, setAction] = useState<Action>();
  const [selectedUsers, setSelectedUsers] = useState<React.Key[]>([]);
  const [teamSelectedUsers, setTeamSelectedUsers] = useState<React.Key[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [architectureTitle, setArchitectureTitle] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');
  const architectureContainerRef = useRef<HTMLDivElement>(null);
  const architectureGraphRef = useRef<Graph>();
  const [form] = Form.useForm();
  const isOrganizationForm = action === 'organization' || action === 'organizationEdit';
  const isDepartmentForm = action === 'department' || action === 'departmentEdit';

  const loadOrganizations = async () => {
    const result = await listPlatformOrganizations();
    const items: Organization[] = Array.isArray(result.data) ? result.data : [];
    const enriched = await Promise.all(
      items.map(async (organization) => {
        const [teamResult, memberResult] = await Promise.all([
          listPlatformTeams(organization.id),
          listPlatformMembers(organization.id),
        ]);
        const members = Array.isArray(memberResult.data) ? memberResult.data : [];
        return {
          ...organization,
          teamCount: Array.isArray(teamResult.data) ? teamResult.data.length : 0,
          memberCount: members.length,
        };
      }),
    );
    setOrganizations(enriched);
    setSummary({
      departments: enriched.reduce((n, item) => n + (item.teamCount || 0), 0),
      members: enriched.reduce((n, item) => n + (item.memberCount || 0), 0),
    });
    return enriched;
  };
  const loadTeams = async (id: string) => {
    const result = await listPlatformTeams(id);
    const items = Array.isArray(result.data) ? result.data : [];
    setTeams(items);
    return items;
  };
  const userLabel = (userId: string, options = userOptions) =>
    options.find((option) => String(option.value) === String(userId))?.label ||
    t('pages.organization.architecture.unknownUser');
  const loadArchitecture = async (id: string, departments: Team[], options = userOptions) => {
    const organization = organizations.find((item) => item.id === id);
    const nodes: any[] = [
      {
        id: `organization-${id}`,
        data: {
          label: organization
            ? `${organization.name}${organization.code ? ` (${organization.code})` : ''}`
            : id,
          nodeType: 'organization',
        },
      },
    ];
    const edges: any[] = [];
    await Promise.all(
      departments.map(async (department) => {
        const result = await listPlatformTeamMembers(id, department.id);
        const members = Array.isArray(result.data) ? result.data : [];
        const departmentId = `department-${department.id}`;
        nodes.push({
          id: departmentId,
          data: {
            label: `${department.name}${department.code ? ` (${department.code})` : ''}`,
            nodeType: 'department',
          },
        });
        edges.push({
          id: `edge-organization-${department.id}`,
          source: `organization-${id}`,
          target: departmentId,
          animated: false,
        });
        members.forEach((member: any) => {
          const memberId = `member-${department.id}-${member.userId}`;
          nodes.push({
            id: memberId,
            data: {
              label: `${userLabel(member.userId, options)} · ${roleLabel(member.roleCode, intl)}`,
              nodeType: 'member',
            },
          });
          edges.push({
            id: `edge-${department.id}-${member.userId}`,
            source: departmentId,
            target: memberId,
          });
        });
      }),
    );
    setArchitectureData({ nodes, edges });
  };
  const selectOrganization = async (id: string) => {
    setOrganizationId(id);
    setTeamId(undefined);
    const [departments, memberResult, optionsResult] = await Promise.all([
      loadTeams(id),
      listPlatformMembers(id),
      listPlatformUserOptions(),
    ]);
    setTeams(departments);
    setOrganizationMembers(Array.isArray(memberResult.data) ? memberResult.data : []);
    const options = Array.isArray(optionsResult.data) ? optionsResult.data : [];
    setUserOptions(options);
    await loadArchitecture(id, departments, options);
  };
  const openArchitecture = async (organization: Organization) => {
    setArchitectureTitle(organization.name);
    const [departments, optionsResult] = await Promise.all([
      loadTeams(organization.id),
      listPlatformUserOptions(),
    ]);
    const options = Array.isArray(optionsResult.data) ? optionsResult.data : [];
    setUserOptions(options);
    await loadArchitecture(organization.id, departments, options);
    setArchitectureOpen(true);
  };
  const openTeamMembers = async (id: string) => {
    if (!organizationId) return;
    setTeamId(id);
    const [teamResult, memberResult, optionsResult] = await Promise.all([
      listPlatformTeamMembers(organizationId, id),
      listPlatformMembers(organizationId),
      listPlatformUserOptions(),
    ]);
    setTeamMembers(Array.isArray(teamResult.data) ? teamResult.data : []);
    setOrganizationMembers(Array.isArray(memberResult.data) ? memberResult.data : []);
    setUserOptions(Array.isArray(optionsResult.data) ? optionsResult.data : []);
    setTeamSelectedUsers([]);
    setAction('teamMember');
  };
  const close = () => {
    setAction(undefined);
    form.resetFields();
    setSelectedUsers([]);
  };
  const refresh = () => {
    loadOrganizations();
    orgRef.current?.reload();
    teamRef.current?.reload();
    memberRef.current?.reload();
  };
  const refreshOrganizationContext = async (id: string) => {
    setSelectedUsers([]);
    setTeamSelectedUsers([]);
    setTeamId(undefined);
    setTeamMembers([]);
    await selectOrganization(id);
    teamRef.current?.reload();
    memberRef.current?.reload();
    orgRef.current?.reload();
  };
  useEffect(() => {
    loadOrganizations();
  }, []);
  useEffect(() => {
    if (!architectureOpen || !architectureContainerRef.current) return undefined;
    const graph = new Graph({
      container: architectureContainerRef.current,
      autoFit: 'view',
      padding: 48,
      data: architectureData,
      layout: {
        type: 'compact-box',
        direction: 'TB',
        getId: (datum: any) => datum.id,
        getWidth: () => 220,
        getHeight: (datum: any) => (datum.data?.nodeType === 'member' ? 54 : 72),
        getVGap: () => 36,
        getHGap: () => 24,
      },
      node: {
        type: 'html',
        style: (datum: any) => {
          const type = datum.data?.nodeType;
          const color =
            type === 'organization' ? '#1677ff' : type === 'department' ? '#e6f4ff' : '#ffffff';
          const border =
            type === 'organization' ? '#1677ff' : type === 'department' ? '#91caff' : '#d9d9d9';
          return {
            size: type === 'member' ? [220, 58] : [220, 76],
            dx: -110,
            dy: type === 'member' ? -29 : -38,
            innerHTML: `<div style="width:100%;height:100%;box-sizing:border-box;background:${color};border:1px solid ${border};border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 2px 8px rgba(31,45,61,.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;cursor:pointer;"><span style="color:${type === 'organization' ? '#fff' : '#1f2d3d'};font-size:${type === 'member' ? '12px' : '14px'};font-weight:${type === 'member' ? 400 : 600};line-height:18px;word-break:break-word;">${escapeHtml(String(datum.data?.label || ''))}</span></div>`,
          };
        },
      },
      edge: {
        type: 'cubic-vertical',
        style: { stroke: '#b7c7db', lineWidth: 1.5 },
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'click-select',
        { type: 'collapse-expand', trigger: 'click' },
      ],
    });
    architectureGraphRef.current = graph;
    graph.render();
    return () => {
      graph.destroy();
      architectureGraphRef.current = undefined;
    };
  }, [architectureOpen, architectureData]);
  const orgColumns: any[] = [
    {
      title: t('pages.organization.architecture.name'),
      dataIndex: 'name',
      render: (_: any, row: Organization) => (
        <Space>
          <ApartmentOutlined style={{ color: '#1677ff' }} />
          <span>
            <b>{row.name}</b>
            <br />
            <small style={{ color: '#7b8aa3' }}>{row.code}</small>
          </span>
        </Space>
      ),
    },
    {
      title: t('pages.organization.architecture.type'),
      render: () => <Tag>{t('pages.organization.architecture.organization')}</Tag>,
    },
    { title: t('pages.organization.architecture.departmentCount'), dataIndex: 'teamCount' },
    { title: t('pages.organization.architecture.memberCount'), dataIndex: 'memberCount' },
    {
      title: t('pages.organization.architecture.action'),
      valueType: 'option',
      render: (_: any, row: Organization) => (
        <Space>
          <Button type="link" icon={<ApartmentOutlined />} onClick={() => openArchitecture(row)}>
            {t('pages.organization.architecture.viewArchitecture')}
          </Button>
          <Button
            type="link"
            onClick={() => {
              form.setFieldsValue(row);
              setAction('organizationEdit');
            }}
          >
            {t('pages.organization.architecture.edit')}
          </Button>
          <Button
            type="link"
            danger
            onClick={async () => {
              await deletePlatformOrganization(row.id);
              message.success(t('pages.organization.architecture.removed'));
              if (organizationId === row.id) {
                setOrganizationId(undefined);
                setTeamId(undefined);
                setTeams([]);
                setOrganizationMembers([]);
                setTeamMembers([]);
                setArchitectureData({ nodes: [], edges: [] });
              }
              refresh();
            }}
          >
            {t('pages.organization.architecture.remove')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={t('pages.organization.architecture.title')}
      subTitle={t('pages.organization.architecture.subtitle')}
      extra={
        <Button icon={<ReloadOutlined />} onClick={refresh}>
          {t('pages.organization.architecture.refresh')}
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: t('pages.organization.architecture.organizationCount'),
              value: organizations.length,
              prefix: <ApartmentOutlined />,
              description: t('pages.organization.architecture.normal'),
            }}
          />
        </Col>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: t('pages.organization.architecture.departmentCount'),
              value: summary.departments,
              prefix: <TeamOutlined />,
              description: t('pages.organization.architecture.realTimeOnList'),
            }}
          />
        </Col>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: t('pages.organization.architecture.memberCount'),
              value: summary.members,
              prefix: <UserOutlined />,
              description: t('pages.organization.architecture.realTimeOnList'),
            }}
          />
        </Col>
      </Row>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'organizations',
            label: t('pages.organization.architecture.organizationManagement'),
            children: (
              <ProTable
                actionRef={orgRef}
                rowKey="id"
                search={false}
                options={false}
                request={async () => ({ data: await loadOrganizations(), success: true })}
                toolBarRender={() => [
                  <Button
                    key="create"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAction('organization')}
                  >
                    {t('pages.organization.architecture.createOrganization')}
                  </Button>,
                ]}
                columns={orgColumns}
              />
            ),
          },
          {
            key: 'structure',
            label: t('pages.organization.architecture.departmentArchitecture'),
            children: (
              <Row gutter={16}>
                <Col xs={24} md={7}>
                  <Card title={t('pages.organization.architecture.organizationDirectory')}>
                    <ProTable
                      rowKey="id"
                      search={false}
                      options={false}
                      pagination={false}
                      request={async () => ({ data: await loadOrganizations(), success: true })}
                      columns={
                        [
                          {
                            title: t('pages.organization.architecture.name'),
                            dataIndex: 'name',
                            render: (_: any, row: Organization) => (
                              <Button
                                type={organizationId === row.id ? 'primary' : 'text'}
                                block
                                onClick={() => selectOrganization(row.id)}
                              >
                                {row.name}
                              </Button>
                            ),
                          },
                        ] as any
                      }
                    />
                  </Card>
                </Col>
                <Col xs={24} md={17}>
                  {organizationId ? (
                    <>
                      <Card
                        title={t('pages.organization.architecture.departmentList')}
                        style={{ marginTop: 16 }}
                        extra={
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setAction('department')}
                          >
                            {t('pages.organization.architecture.createDepartment')}
                          </Button>
                        }
                      >
                        <ProTable
                          key={organizationId}
                          actionRef={teamRef}
                          rowKey="id"
                          search={false}
                          options={false}
                          request={async () => ({
                            data: await loadTeams(organizationId),
                            success: true,
                          })}
                          columns={
                            [
                              {
                                title: t('pages.organization.architecture.departmentName'),
                                dataIndex: 'name',
                              },
                              {
                                title: t('pages.organization.architecture.action'),
                                valueType: 'option',
                                render: (_: any, row: Team) => (
                                  <Space>
                                    <Button type="link" onClick={() => openTeamMembers(row.id)}>
                                      {t('pages.organization.architecture.viewMembers')}
                                    </Button>
                                    <Button
                                      type="link"
                                      onClick={() => {
                                        form.setFieldsValue(row);
                                        setAction('departmentEdit');
                                      }}
                                    >
                                      {t('pages.organization.architecture.edit')}
                                    </Button>
                                    <Button
                                      type="link"
                                      danger
                                      onClick={async () => {
                                        await deletePlatformTeam(organizationId, row.id);
                                        message.success(
                                          t('pages.organization.architecture.removed'),
                                        );
                                        if (teamId === row.id) {
                                          setTeamId(undefined);
                                          setTeamMembers([]);
                                          close();
                                        }
                                        await refreshOrganizationContext(organizationId);
                                      }}
                                    >
                                      {t('pages.organization.architecture.remove')}
                                    </Button>
                                  </Space>
                                ),
                              },
                            ] as any
                          }
                        />
                      </Card>
                    </>
                  ) : (
                    <Card title={t('pages.organization.architecture.selectOrganization')}>
                      <div style={{ padding: 60, textAlign: 'center', color: '#7b8aa3' }}>
                        {t('pages.organization.architecture.selectOrganizationHint')}
                      </div>
                    </Card>
                  )}
                </Col>
              </Row>
            ),
          },
          {
            key: 'members',
            label: t('pages.organization.architecture.memberAssignment'),
            children: (
              <Card
                title={t('pages.organization.architecture.memberList')}
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!selectedUsers.length}
                    onClick={() => organizationId && setAction('member')}
                  >
                    {t('pages.organization.architecture.batchJoinOrganization')}
                  </Button>
                }
              >
                {organizationId ? (
                  <ProTable
                    actionRef={memberRef}
                    rowKey="value"
                    rowSelection={{
                      selectedRowKeys: selectedUsers,
                      onChange: setSelectedUsers,
                      getCheckboxProps: (row: any) => ({ disabled: Boolean(row.roleCode) }),
                    }}
                    search={false}
                    options={false}
                    request={async () => {
                      const [all, assigned] = await Promise.all([
                        listPlatformUserOptions(),
                        listPlatformMembers(organizationId),
                      ]);
                      const assignedByUser = new Map(
                        (assigned.data || []).map((item: any) => [
                          String(item.userId),
                          item.roleCode,
                        ]),
                      );
                      return {
                        data: (all.data || []).map((item: any) => ({
                          ...item,
                          roleCode: assignedByUser.get(String(item.value)) || undefined,
                        })),
                        success: true,
                      };
                    }}
                    columns={
                      [
                        {
                          title: t('pages.organization.architecture.user'),
                          dataIndex: 'label',
                          render: (value: string, row: any) => (
                            <Space>
                              <UserOutlined style={{ color: '#1677ff' }} />
                              <b>{value}</b>
                            </Space>
                          ),
                        },
                        {
                          title: t('pages.organization.architecture.memberStatus'),
                          dataIndex: 'roleCode',
                          render: (value: string) =>
                            value ? (
                              <Tag color="green">
                                {t('pages.organization.architecture.assigned')}
                              </Tag>
                            ) : (
                              <Tag>{t('pages.organization.architecture.notAssigned')}</Tag>
                            ),
                        },
                        {
                          title: t('pages.organization.architecture.operation'),
                          render: (_: any, row: any) =>
                            row.roleCode ? (
                              <Space>
                                <Tag color="green">
                                  {t('pages.organization.architecture.assigned')}
                                </Tag>
                                <Popconfirm
                                  title={t(
                                    'pages.organization.architecture.confirmRemoveFromOrganization',
                                  )}
                                  description={t(
                                    'pages.organization.architecture.confirmRemoveFromOrganizationHint',
                                  )}
                                  okText={t('pages.organization.architecture.remove')}
                                  cancelText={t('pages.organization.architecture.cancel')}
                                  onConfirm={async () => {
                                    await removeOrganizationMember(
                                      organizationId,
                                      String(row.value),
                                    );
                                    message.success(
                                      t('pages.organization.architecture.removedFromOrganization'),
                                    );
                                    await refreshOrganizationContext(organizationId);
                                  }}
                                >
                                  <Button type="link" danger>
                                    {t('pages.organization.architecture.removeFromOrganization')}
                                  </Button>
                                </Popconfirm>
                              </Space>
                            ) : (
                              <Button
                                type="link"
                                onClick={async () => {
                                  await assignOrganizationMember({
                                    organizationId,
                                    userId: String(row.value),
                                  });
                                  message.success(t('pages.organization.architecture.assigned'));
                                  await refreshOrganizationContext(organizationId);
                                }}
                              >
                                {t('pages.organization.architecture.assignToOrganization')}
                              </Button>
                            ),
                        },
                      ] as any
                    }
                  />
                ) : (
                  <div style={{ padding: 60, textAlign: 'center', color: '#7b8aa3' }}>
                    {t('pages.organization.architecture.selectOrganizationHint')}
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />
      <Drawer
        title={
          architectureTitle
            ? `${architectureTitle} · ${t('pages.organization.architecture.viewArchitecture')}`
            : t('pages.organization.architecture.viewArchitecture')
        }
        open={architectureOpen}
        onClose={() => setArchitectureOpen(false)}
        width={980}
        destroyOnClose
        extra={
          <Space>
            <Button size="small" onClick={() => architectureGraphRef.current?.fitView()}>
              {t('pages.organization.architecture.fitView')}
            </Button>
            <Button size="small" onClick={() => architectureGraphRef.current?.render()}>
              {t('pages.organization.architecture.refresh')}
            </Button>
          </Space>
        }
      >
        <Card
          bordered={false}
          title={t('pages.organization.architecture.flowView')}
          bodyStyle={{ padding: 0 }}
        >
          <div
            ref={architectureContainerRef}
            style={{ height: 650, background: '#f7f9fc', borderRadius: 8 }}
          />
        </Card>
      </Drawer>
      <Drawer
        title={
          action === 'organization'
            ? t('pages.organization.architecture.createOrganization')
            : action === 'organizationEdit'
              ? t('pages.organization.architecture.edit')
              : action === 'department'
                ? t('pages.organization.architecture.createDepartment')
                : action === 'departmentEdit'
                  ? t('pages.organization.architecture.edit')
                  : action === 'member'
                    ? t('pages.organization.architecture.batchJoinOrganization')
                    : t('pages.organization.architecture.viewMembers')
        }
        open={!!action}
        onClose={close}
        destroyOnClose
      >
        {action === 'teamMember' ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card
              size="small"
              title={t('pages.organization.architecture.currentDepartmentMembers')}
            >
              <ProTable
                rowKey="id"
                search={false}
                options={false}
                pagination={false}
                dataSource={teamMembers}
                columns={
                  [
                    {
                      title: t('pages.organization.architecture.user'),
                      dataIndex: 'userId',
                      render: (value: string) => userLabel(value),
                    },
                    {
                      title: t('pages.organization.architecture.role'),
                      dataIndex: 'roleCode',
                      render: (value: string, row: any) => (
                        <Select
                          size="small"
                          value={value}
                          style={{ minWidth: 150 }}
                          options={DEPARTMENT_ROLE_OPTIONS.map((roleCode) => ({
                            value: roleCode,
                            label: roleLabel(roleCode, intl),
                          }))}
                          onChange={async (roleCode) => {
                            if (organizationId && teamId) {
                              await assignTeamMember({
                                organizationId,
                                teamId,
                                userId: row.userId,
                                roleCode,
                              });
                              await openTeamMembers(teamId);
                              await loadArchitecture(organizationId, teams, userOptions);
                              message.success(t('pages.organization.architecture.updated'));
                            }
                          }}
                        />
                      ),
                    },
                    {
                      title: t('pages.organization.architecture.action'),
                      valueType: 'option',
                      render: (_: any, row: any) => (
                        <Button
                          type="link"
                          danger
                          onClick={async () => {
                            if (organizationId && teamId) {
                              await removeTeamMember(organizationId, teamId, row.userId);
                              await openTeamMembers(teamId);
                              const departments = await loadTeams(organizationId);
                              await loadArchitecture(organizationId, departments, userOptions);
                              message.success(t('pages.organization.architecture.removed'));
                            }
                          }}
                        >
                          {t('pages.organization.architecture.remove')}
                        </Button>
                      ),
                    },
                  ] as any
                }
              />
            </Card>
            <Card
              size="small"
              title={t('pages.organization.architecture.addDepartmentMembers')}
              extra={
                <Button
                  type="primary"
                  disabled={!teamSelectedUsers.length}
                  onClick={async () => {
                    if (organizationId && teamId) {
                      await Promise.all(
                        teamSelectedUsers.map((userId) =>
                          assignTeamMember({
                            organizationId,
                            teamId,
                            userId: String(userId),
                            roleCode: ORGANIZATION_MEMBER_ROLE,
                          }),
                        ),
                      );
                      message.success(t('pages.organization.architecture.saved'));
                      await openTeamMembers(teamId);
                      const departments = await loadTeams(organizationId);
                      await loadArchitecture(organizationId, departments, userOptions);
                    }
                  }}
                >
                  {t('pages.organization.architecture.assignToDepartment')}
                </Button>
              }
            >
              <ProTable
                rowKey="userId"
                search={false}
                options={false}
                pagination={false}
                rowSelection={{
                  selectedRowKeys: teamSelectedUsers,
                  onChange: setTeamSelectedUsers,
                }}
                dataSource={organizationMembers.filter(
                  (member) =>
                    !teamMembers.some(
                      (assigned) => String(assigned.userId) === String(member.userId),
                    ),
                )}
                columns={
                  [
                    {
                      title: t('pages.organization.architecture.user'),
                      dataIndex: 'userId',
                      render: (value: string) => userLabel(value),
                    },
                    {
                      title: t('pages.organization.architecture.memberStatus'),
                      dataIndex: 'roleCode',
                      render: () => <Tag>{roleLabel(ORGANIZATION_MEMBER_ROLE, intl)}</Tag>,
                    },
                  ] as any
                }
              />
            </Card>
          </Space>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={async (values) => {
              if (action === 'organization') await createPlatformOrganization(values);
              if (action === 'organizationEdit') await updatePlatformOrganization(values);
              if (action === 'department' && organizationId)
                await createPlatformTeam({ ...values, organizationId });
              if (action === 'departmentEdit' && organizationId)
                await updatePlatformTeam({ ...values, organizationId });
              if (action === 'member' && organizationId)
                await Promise.all(
                  selectedUsers.map((userId) =>
                    assignOrganizationMember({
                      organizationId,
                      userId: String(userId),
                    }),
                  ),
                );
              message.success(t('pages.organization.architecture.saved'));
              close();
              if (
                organizationId &&
                ['department', 'departmentEdit', 'member'].includes(action || '')
              ) {
                await refreshOrganizationContext(organizationId);
              } else {
                refresh();
              }
            }}
          >
            {(isOrganizationForm || isDepartmentForm) && (
              <>
                <Form.Item
                  name="name"
                  label={t('pages.organization.architecture.name')}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="code"
                  label={t('pages.organization.architecture.code')}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </>
            )}
            {action === 'member' && (
              <>
                <div style={{ marginBottom: 18 }}>
                  {t('pages.organization.architecture.selectedUsers', {
                    count: selectedUsers.length,
                  })}
                </div>
              </>
            )}
            <Button type="primary" htmlType="submit" block>
              {t('pages.organization.architecture.save')}
            </Button>
          </Form>
        )}
      </Drawer>
    </PageContainer>
  );
}
