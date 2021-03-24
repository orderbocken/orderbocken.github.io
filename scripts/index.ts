import { parse as parseCsv } from "https://deno.land/std@0.82.0/encoding/csv.ts";

const inputFileName = Deno.args[0];
const accounts: string[] = Deno.args.slice(1);

const numberParseFunc = (e: string): number => {
  return Number.parseFloat(e);
};

const content: Holding[] = (await parseCsv(
  await Deno.readTextFile(inputFileName),
  {
    skipFirstRow: true,
    separator: ";",
    columns: [
      { name: "accountNumber" },
      { name: "name" },
      {
        name: "volume",
        parse: numberParseFunc,
      },
      {
        name: "value",
        parse: numberParseFunc,
      },
      {
        name: "avg",
        parse: numberParseFunc,
      },
      { name: "isin" },
      { name: "currency" },
      { name: "type" },
    ],
  }
)) as Holding[];

const relevantHoldings = content.filter((holding: Holding) => {
  return accounts.includes(holding.accountNumber);
});

const totalValue = relevantHoldings.reduce((acc: number, curr: Holding) => {
  return acc + curr.value;
}, 0);

const groupedRelevantHoldings = relevantHoldings.reduce(function (
  acc: Record<string, Holding[]>,
  curr: Holding
) {
  if (curr.name) {
    (acc[curr.name] = acc[curr.name] || ([] as Holding[])).push(curr);
  }
  return acc;
},
{});

const holdingSummaries: HoldingSummary[] = Object.values(
  groupedRelevantHoldings
).reduce((acc: HoldingSummary[], curr: Holding[]) => {
  const init: HoldingSummary = {
    name: curr[0].name,
    volume: 0,
    value: 0,
    type: curr[0].type,
    share: 0,
    price: 0,
    gav: 0,
  };

  const summary: HoldingSummary = curr.reduce(
    (acc: HoldingSummary, curr: Holding) => {
      acc.volume = acc.volume + curr.volume;
      acc.value = acc.value + curr.value;
      acc.gav = acc.gav + curr.avg * curr.volume;
      return acc;
    },
    init
  );

  summary.gav = summary.gav / summary.volume;
  summary.share = (summary.value / totalValue) * 100;
  summary.price = summary.value / summary.volume;

  // round to 2 decimals
  summary.share = +(
    Math.round(((summary.share + "e+2") as unknown) as number) + "e-2"
  );

  return [...acc, summary];
}, []);

console.log({
  date: new Date().toISOString(),
  totalValue,
  accounts,
  holdingSummaries: holdingSummaries.sort(
    (a: HoldingSummary, b: HoldingSummary) => {
      return b.share - a.share;
    }
  ),
} as Portfolio);

interface Holding {
  accountNumber: string;
  name: string;
  volume: number;
  value: number;
  avg: number;
  type: string;
}

interface HoldingSummary {
  name: string;
  volume: number;
  value: number;
  price: number;
  share: number;
  gav: number;
  type: string;
}

interface Portfolio {
  date: string;
  totalValue: number;
  accounts: string[];
  holdingSummaries: HoldingSummary[];
}
