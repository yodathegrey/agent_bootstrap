"use client";

const billingPeriod = {
  start: "March 1, 2026",
  end: "March 31, 2026",
  daysRemaining: 9,
};

const usageByAgent = [
  { name: "Customer Support Bot", runs: 2_340, tokens: 890_000, cost: "$7.12" },
  { name: "Code Review Agent", runs: 1_820, tokens: 1_240_000, cost: "$9.92" },
  { name: "Data Pipeline Monitor", runs: 1_150, tokens: 420_000, cost: "$3.36" },
  { name: "Sales Outreach Agent", runs: 890, tokens: 310_000, cost: "$2.48" },
  { name: "Documentation Writer", runs: 410, tokens: 240_000, cost: "$1.92" },
  { name: "Security Scanner", runs: 232, tokens: 100_000, cost: "$0.80" },
];

const tokensByProvider = [
  { provider: "Anthropic (Claude)", tokens: 1_980_000, percentage: 61.9, color: "bg-indigo-600" },
  { provider: "OpenAI (GPT-4o)", tokens: 840_000, percentage: 26.3, color: "bg-green-500" },
  { provider: "Vertex AI (Gemini)", tokens: 380_000, percentage: 11.8, color: "bg-yellow-500" },
];

const dailyUsage = [
  { date: "Mar 1", runs: 210, tokens: 98_000 },
  { date: "Mar 2", runs: 185, tokens: 82_000 },
  { date: "Mar 3", runs: 240, tokens: 112_000 },
  { date: "Mar 4", runs: 320, tokens: 148_000 },
  { date: "Mar 5", runs: 290, tokens: 134_000 },
  { date: "Mar 6", runs: 195, tokens: 88_000 },
  { date: "Mar 7", runs: 160, tokens: 72_000 },
  { date: "Mar 8", runs: 275, tokens: 126_000 },
  { date: "Mar 9", runs: 310, tokens: 144_000 },
  { date: "Mar 10", runs: 340, tokens: 158_000 },
  { date: "Mar 11", runs: 365, tokens: 170_000 },
  { date: "Mar 12", runs: 290, tokens: 132_000 },
  { date: "Mar 13", runs: 220, tokens: 98_000 },
  { date: "Mar 14", runs: 180, tokens: 78_000 },
  { date: "Mar 15", runs: 330, tokens: 152_000 },
  { date: "Mar 16", runs: 355, tokens: 164_000 },
  { date: "Mar 17", runs: 380, tokens: 176_000 },
  { date: "Mar 18", runs: 345, tokens: 158_000 },
  { date: "Mar 19", runs: 310, tokens: 142_000 },
  { date: "Mar 20", runs: 265, tokens: 120_000 },
  { date: "Mar 21", runs: 195, tokens: 86_000 },
  { date: "Mar 22", runs: 182, tokens: 82_000 },
];

const maxRuns = Math.max(...dailyUsage.map((d) => d.runs));

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function UsagePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed breakdown of your platform usage for the current billing
            period.
          </p>
        </div>
        <a
          href="/settings/billing"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Back to Billing
        </a>
      </div>

      {/* Billing Period Info */}
      <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm font-medium text-indigo-900">
              Current Billing Period
            </span>
            <p className="text-sm text-indigo-700">
              {billingPeriod.start} &mdash; {billingPeriod.end}
            </p>
          </div>
          <span className="text-sm font-medium text-indigo-700">
            {billingPeriod.daysRemaining} days remaining
          </span>
        </div>
      </section>

      {/* Daily Usage Chart */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Agent Runs
        </h2>
        <div className="flex items-end gap-1 h-40">
          {dailyUsage.map((day) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer"
                style={{
                  height: `${(day.runs / maxRuns) * 100}%`,
                  minHeight: "2px",
                }}
                title={`${day.date}: ${day.runs} runs, ${formatTokens(day.tokens)} tokens`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">
            {dailyUsage[0].date}
          </span>
          <span className="text-xs text-gray-400">
            {dailyUsage[dailyUsage.length - 1].date}
          </span>
        </div>
      </section>

      {/* Token Usage by Provider */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Token Usage by LLM Provider
        </h2>

        {/* Stacked bar */}
        <div className="w-full h-6 rounded-full overflow-hidden flex mb-4">
          {tokensByProvider.map((provider) => (
            <div
              key={provider.provider}
              className={`${provider.color} h-full`}
              style={{ width: `${provider.percentage}%` }}
              title={`${provider.provider}: ${formatTokens(provider.tokens)} (${provider.percentage}%)`}
            />
          ))}
        </div>

        <div className="space-y-3">
          {tokensByProvider.map((provider) => (
            <div
              key={provider.provider}
              className="flex justify-between items-center"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                <span className="text-sm text-gray-700">
                  {provider.provider}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {formatTokens(provider.tokens)} tokens ({provider.percentage}%)
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <span className="text-sm font-medium text-gray-900">
            Total tokens this period
          </span>
          <span className="text-sm font-medium text-gray-900">
            {formatTokens(
              tokensByProvider.reduce((sum, p) => sum + p.tokens, 0)
            )}
          </span>
        </div>
      </section>

      {/* Usage by Agent */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Usage Breakdown by Agent
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Runs
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Tokens
                </th>
                <th className="py-3 pl-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {usageByAgent.map((agent) => (
                <tr
                  key={agent.name}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900">
                    {agent.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">
                    {agent.runs.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">
                    {formatTokens(agent.tokens)}
                  </td>
                  <td className="py-3 pl-4 text-sm text-gray-900 text-right">
                    {agent.cost}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-3 pr-4 text-sm font-semibold text-gray-900">
                  Total
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                  {usageByAgent
                    .reduce((sum, a) => sum + a.runs, 0)
                    .toLocaleString()}
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                  {formatTokens(
                    usageByAgent.reduce((sum, a) => sum + a.tokens, 0)
                  )}
                </td>
                <td className="py-3 pl-4 text-sm font-semibold text-gray-900 text-right">
                  $
                  {usageByAgent
                    .reduce((sum, a) => sum + parseFloat(a.cost.slice(1)), 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
