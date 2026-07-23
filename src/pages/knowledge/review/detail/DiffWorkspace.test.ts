import { countUnappliedAcceptedIssues } from './reviewState';

describe('countUnappliedAcceptedIssues', () => {
  it('只统计已接受但尚未应用到文档的建议', () => {
    expect(
      countUnappliedAcceptedIssues([
        { handleStatus: 'pending' },
        { handleStatus: 'accepted' },
        {
          handleStatus: 'accepted',
          appliedChecksum: 'checksum',
        },
      ]),
    ).toBe(1);
  });

  it('已接受的建议全部应用后允许继续提交审批', () => {
    expect(
      countUnappliedAcceptedIssues([
        {
          handleStatus: 'accepted',
          appliedChecksum: 'checksum',
        },
      ]),
    ).toBe(0);
  });
});
