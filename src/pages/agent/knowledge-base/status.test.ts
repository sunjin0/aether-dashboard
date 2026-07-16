import { getDocumentStatus, getIndexStatus, getSwitchStatus } from './status';

describe('knowledge-base status labels', () => {
  it('maps documented API status values to display labels and colors', () => {
    expect(getSwitchStatus(0)).toEqual({ label: '禁用', color: 'default' });
    expect(getSwitchStatus(1)).toEqual({ label: '启用', color: 'success' });
    expect(getIndexStatus(0)).toEqual({ label: '未索引', color: 'default' });
    expect(getIndexStatus(1)).toEqual({ label: '索引中', color: 'processing' });
    expect(getIndexStatus(2)).toEqual({ label: '已索引', color: 'success' });
    expect(getDocumentStatus(0)).toEqual({ label: '未处理', color: 'default' });
    expect(getDocumentStatus(1)).toEqual({ label: '处理中', color: 'processing' });
    expect(getDocumentStatus(2)).toEqual({ label: '已完成', color: 'success' });
  });
});
