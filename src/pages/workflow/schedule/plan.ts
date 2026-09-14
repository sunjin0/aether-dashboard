export type SchedulePlan = { type: string; hour: number; minute: number; weekday?: string };
/** Only decode frequencies the form can faithfully round-trip. Preserve all other expressions. */
export function parsePlan(cron: string): SchedulePlan {
  const interval = /^0 \*\/(5|15|30) \* \* \* \*$/.exec(cron);
  if (interval) return { type: `EVERY_${interval[1]}_MINUTES`, hour: 0, minute: 0 };
  const fields = /^0 (\d{1,2}) (\*|\d{1,2}) \* \* (\*|MON-FRI|MON|TUE|WED|THU|FRI|SAT|SUN)$/.exec(
    cron,
  );
  if (
    !fields ||
    Number(fields[1]) > 59 ||
    (fields[2] !== '*' && Number(fields[2]) > 23) ||
    (fields[2] === '*' && fields[3] !== '*')
  )
    return { type: 'CUSTOM', hour: 0, minute: 0 };
  return {
    type:
      fields[2] === '*'
        ? 'HOURLY'
        : fields[3] === '*'
          ? 'DAILY'
          : fields[3] === 'MON-FRI'
            ? 'WEEKDAYS'
            : 'WEEKLY',
    hour: Number(fields[2]) || 0,
    minute: Number(fields[1]),
    weekday: fields[3],
  };
}
