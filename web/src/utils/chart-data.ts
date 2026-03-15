export type RoyaltyData = {
  year: number;
  month: number;
  totalEarnings: number;
};

export type ChartDataPoint = {
  year: string;
  month: number;
  earning: number;
};

export function formatChartDataWithRange(
  royalties: RoyaltyData[],
  fromDate: Date,
  toDate: Date,
): ChartDataPoint[] {
  if (!royalties || royalties.length === 0) return [];

  // Create a map of existing data for quick lookup
  const existingDataMap = new Map<string, RoyaltyData>();
  royalties.forEach((royalty) => {
    const key = `${royalty.year}-${royalty.month}`;
    existingDataMap.set(key, royalty);
  });

  // Generate all months in the specified range
  const completeData: ChartDataPoint[] = [];
  const startYear = fromDate.getFullYear();
  const startMonth = fromDate.getMonth() + 1; // getMonth() is 0-based
  const endYear = toDate.getFullYear();
  const endMonth = toDate.getMonth() + 1;

  for (let year = startYear; year <= endYear; year++) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      const key = `${year}-${month}`;
      const existingEntry = existingDataMap.get(key);

      if (existingEntry) {
        completeData.push({
          year: existingEntry.year.toString(),
          month: existingEntry.month,
          earning: existingEntry.totalEarnings,
        });
      } else {
        // Add missing month with zero earnings
        completeData.push({
          year: year.toString(),
          month: month,
          earning: 0,
        });
      }
    }
  }

  return completeData;
}

export function getDateRange6MonthsBack(toDate?: Date): { fromDate: Date; toDate: Date } {
  const endDate = toDate || new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 6);

  return { fromDate: startDate, toDate: endDate };
}
