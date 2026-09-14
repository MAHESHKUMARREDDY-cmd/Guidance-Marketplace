import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatINR, getInitials, verticalLabel } from "../utils.js";

const VERTICALS = [
  { value: "", label: "All verticals" },
  { value: "finance", label: "Personal Finance & Planning" },
  { value: "career", label: "Career & Work Guidance" },
];

const FUND_HOUSES = ["SBI Mutual Fund", "HDFC Mutual Fund", "ICICI Prudential", "Nippon India", "Aditya Birla Sun Life", "Axis Mutual Fund", "Kotak Mahindra", "UTI Mutual Fund", "Mirae Asset", "DSP Mutual Fund", "Tata Mutual Fund", "Canara Robeco", "Motilal Oswal", "Parag Parikh"];
const FUND_TEMPLATES = [
  { suffix: "Nifty 50 Index Fund", vehicle: "Mutual Fund", type: "Equity · Index", risk: "Moderate", base3y: 14.8, base5y: 13.6, expense: 0.22 },
  { suffix: "Flexi Cap Fund", vehicle: "Mutual Fund", type: "Equity · Flexi cap", risk: "High", base3y: 17.2, base5y: 15.4, expense: 0.62 },
  { suffix: "Balanced Advantage Fund", vehicle: "Mutual Fund", type: "Hybrid · Dynamic", risk: "Moderate", base3y: 12.6, base5y: 11.4, expense: 0.48 },
  { suffix: "Short Duration Debt Fund", vehicle: "Mutual Fund", type: "Debt · Short duration", risk: "Low", base3y: 7.4, base5y: 7.1, expense: 0.28 },
  { suffix: "Nifty 50 ETF", vehicle: "ETF", type: "ETF · Equity index", risk: "Moderate", base3y: 15.1, base5y: 13.9, expense: 0.12 },
];
const INVESTMENT_FUNDS = FUND_HOUSES.flatMap((house, houseIndex) => FUND_TEMPLATES.map((template, templateIndex) => {
  const variation = ((houseIndex * 7 + templateIndex * 3) % 9) / 10;
  const return3y = Number((template.base3y + variation).toFixed(1));
  const return5y = Number((template.base5y + variation).toFixed(1));
  const nav = Number((28 + houseIndex * 11 + templateIndex * 8.4 + variation).toFixed(2));
  const riskScore = template.risk === "High" ? 6 : template.risk === "Moderate" ? 4 : 2;
  return {
    id: `${houseIndex}-${templateIndex}`,
    house,
    name: `${house} ${template.suffix}`,
    vehicle: template.vehicle,
    type: template.type,
    risk: template.risk,
    return3y: `${return3y}%`,
    return5y: `${return5y}%`,
    expense: `${template.expense.toFixed(2)}%`,
    nav: `₹${nav.toFixed(2)}`,
    return1y: `${Number((return5y + 1.2).toFixed(1))}%`,
    sinceInception: `${Number((return5y - 0.8).toFixed(1))}%`,
    volatility: `${(riskScore + 5.4).toFixed(1)}%`,
    maxDrawdown: `-${(riskScore * 2.1 + 4.2).toFixed(1)}%`,
    aum: `₹${(180 + houseIndex * 145 + templateIndex * 85)} Cr`,
    inception: `${2012 + ((houseIndex + templateIndex) % 10)}`,
    benchmark: template.vehicle === "ETF" ? "NIFTY 50 TRI" : template.type.includes("Debt") ? "CRISIL Short Duration" : "NIFTY 50 TRI",
    manager: { name: "Verified manager profile pending", experience: "Not connected", background: "AMFI / regulator source required", source: "No verified profile feed connected" },
    flows: [
      { period: "Q1", value: `₹${18 + houseIndex * 3} Cr` },
      { period: "Q2", value: `₹${24 + houseIndex * 3} Cr` },
      { period: "Q3", value: `₹${20 + houseIndex * 3} Cr` },
      { period: "Q4", value: `₹${29 + houseIndex * 3} Cr` },
    ],
    holdings: template.vehicle === "ETF"
      ? [{ name: "Reliance Industries", weight: "10.4%" }, { name: "HDFC Bank", weight: "9.1%" }, { name: "ICICI Bank", weight: "8.2%" }, { name: "Infosys", weight: "5.8%" }, { name: "TCS", weight: "4.3%" }]
      : [{ name: "Large-cap equity basket", weight: "42.0%" }, { name: "Mid-cap equity basket", weight: "24.5%" }, { name: "Financial services", weight: "16.8%" }, { name: "Technology", weight: "9.6%" }, { name: "Cash and others", weight: "7.1%" }],
    history: [42, 47, 46, 55, 61, 58, 68, 73, 79, 88].map((value, index) => Math.min(96, value + houseIndex % 5 - templateIndex + (index > 5 ? houseIndex % 3 : 0))),
  };
}));

const MARKET_SYMBOLS = [
  { symbol: "^NSEI", name: "NIFTY 50", kind: "index" },
  { symbol: "^BSESN", name: "SENSEX", kind: "index" },
  { symbol: "NIFTYBEES.NS", name: "Nippon India ETF Nifty BeES", kind: "etf" },
  { symbol: "JUNIORBEES.NS", name: "Nippon India ETF Junior BeES", kind: "etf" },
  { symbol: "GOLDBEES.NS", name: "Nippon India ETF Gold BeES", kind: "etf" },
];

function formatMarketValue(quote) {
  if (quote.price === null) return "Unavailable";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(quote.price);
}

function formatMarketChange(quote) {
  if (quote.changePercent === null) return "Awaiting quote";
  const sign = quote.changePercent >= 0 ? "+" : "";
  return `${sign}${quote.changePercent.toFixed(2)}% today`;
}
// Note: 'emotional' and 'companionship' are intentionally withheld from Phase 1
// until crisis-escalation and background-check infrastructure exist (see PRD Phase 3/4).

export default function Directory({ user }) {
  const [guides, setGuides] = useState([]);
  const [vertical, setVertical] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState(75000);
  const [monthlyNeeds, setMonthlyNeeds] = useState(45000);
  const [savings, setSavings] = useState(300000);
  const [toolMode, setToolMode] = useState("runway");
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("");
  const [focusAnswer, setFocusAnswer] = useState("");
  const focusAreas = [
    { id: "switching", label: "Switching jobs", detail: "Compare an offer, role, or career move.", vertical: "career", question: "What is the main decision?", options: { offer: "Compare a new offer", burnout: "Move away from a difficult role", direction: "Change my career direction" }, recommendations: { offer: "Compare total compensation, role scope, manager quality, learning, location, and stability before looking only at the headline salary.", burnout: "Separate an urgent exit from a long-term career move. Set a minimum financial buffer and define the conditions your next role must meet.", direction: "Start with transferable skills, target roles, and a realistic learning plan before choosing a course or title." } },
    { id: "interview", label: "Interview preparation", detail: "Prepare with a clearer point of view.", vertical: "career", question: "What kind of interview is ahead?", options: { first: "First screening or HR round", technical: "Technical or case round", leadership: "Manager or leadership round" }, recommendations: { first: "Prepare a two-minute story covering your work, impact, and the role you want. Keep examples specific and measurable.", technical: "Practise the reasoning behind your answer, not only the final answer. Explain assumptions, trade-offs, and how you would validate the result.", leadership: "Prepare examples of ownership, conflict, prioritisation, and outcomes. Strong leadership answers show what changed because of your actions." } },
    { id: "salary", label: "Salary negotiation", detail: "Enter the conversation with evidence.", vertical: "career", question: "What are you negotiating?", options: { offer: "A new job offer", raise: "A raise in my current role", counter: "A counteroffer or retention discussion" }, recommendations: { offer: "Compare fixed pay, variable pay, joining bonus, equity, benefits, notice period, and role scope. Ask for the complete structure in writing.", raise: "Build a short evidence sheet with outcomes, expanded responsibilities, market context, and the specific adjustment you are requesting.", counter: "Decide what would genuinely change your situation. A higher number does not solve a role, manager, growth, or culture problem by itself." } },
    { id: "emergency", label: "Emergency savings", detail: "Understand the buffer your life needs.", vertical: "finance", question: "Where are you starting?", options: { starting: "I have little or no buffer", building: "I am building my buffer", review: "I want to review my target" }, recommendations: { starting: "Begin with one month of essential expenses in an accessible account. Automate a small amount and remove avoidable high-interest debt first.", building: "Work toward three to six months of essential expenses. Keep this money accessible and separate from long-term investments.", review: "Recalculate using essential expenses, dependants, job stability, health needs, and how quickly your income could be replaced." } },
    { id: "sip", label: "SIP and investing", detail: "Explore time, return, and contribution trade-offs.", vertical: "finance", question: "What is your investing stage?", options: { new: "I am starting", existing: "I already invest", goal: "I have a specific goal" }, recommendations: { new: "Start only after your basic buffer and expensive debt are addressed. Choose an amount you can continue through both good and difficult months.", existing: "Review the purpose, time horizon, risk, costs, and concentration of your existing investments. Do not change a plan only because of short-term market movement.", goal: "Work backwards from the goal amount, timeline, and contribution you can sustain. The required return should be realistic, not chosen to make the calculator look better." } },
    { id: "tax", label: "Tax and benefits", detail: "Make sense of the choices around your income.", vertical: "finance", question: "What kind of income do you manage?", options: { salary: "Salary and employer benefits", freelance: "Freelance or variable income", multiple: "Multiple income sources" }, recommendations: { salary: "Collect your Form 16, investment proofs, insurance details, and benefits before comparing tax regimes. Use your actual numbers, not generic examples.", freelance: "Separate business and personal cash flow, keep a tax reserve, track invoices and eligible expenses, and speak with a qualified tax professional.", multiple: "Map every income source, advance-tax responsibility, deductions, and documentation in one place before making a year-end decision." } },
  ];
  const activeFocus = focusAreas.find((area) => area.id === selectedFocus);
  const focusRecommendation = activeFocus?.recommendations[focusAnswer];
  const [sipAmount, setSipAmount] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanYears, setLoanYears] = useState(20);
  const [plannerAnswers, setPlannerAnswers] = useState({
    goal: "stability",
    income: 75000,
    expenses: 45000,
    savings: 300000,
    debt: "none",
    timeline: "steady",
  });
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [fundFilter, setFundFilter] = useState("All");
  const [fundVehicleFilter, setFundVehicleFilter] = useState("All funds");
  const [fundHouseFilter, setFundHouseFilter] = useState("All fund houses");
  const [fundSearch, setFundSearch] = useState("");
  const [compareFundIds, setCompareFundIds] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState("nifty");
  const [investmentAmount, setInvestmentAmount] = useState(5000);
  const [fundSipYears, setFundSipYears] = useState(10);
  const [fundSipRate, setFundSipRate] = useState(12);
  const [investmentFrequency, setInvestmentFrequency] = useState("Monthly");
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");
  const selectedFund = INVESTMENT_FUNDS.find((fund) => fund.id === selectedFundId) || INVESTMENT_FUNDS[0];
  const comparedFunds = compareFundIds.map((id) => INVESTMENT_FUNDS.find((fund) => fund.id === id)).filter(Boolean);
  const filteredFunds = INVESTMENT_FUNDS.filter((fund) => {
    const matchesRisk = fundFilter === "All" || fund.risk === fundFilter;
    const matchesVehicle = fundVehicleFilter === "All funds" || fund.vehicle === fundVehicleFilter;
    const matchesHouse = fundHouseFilter === "All fund houses" || fund.house === fundHouseFilter;
    const query = fundSearch.trim().toLowerCase();
    return matchesRisk && matchesVehicle && matchesHouse && (!query || `${fund.name} ${fund.type} ${fund.house}`.toLowerCase().includes(query));
  });
  const fundMonthlyRate = fundSipRate / 100 / 12;
  const fundSipMonths = fundSipYears * 12;
  const fundProjectedValue = fundMonthlyRate > 0
    ? investmentAmount * ((Math.pow(1 + fundMonthlyRate, fundSipMonths) - 1) / fundMonthlyRate) * (1 + fundMonthlyRate)
    : investmentAmount * fundSipMonths;
  const fundInvestedValue = investmentAmount * fundSipMonths;
  const recommendationPool = comparedFunds.length > 0 ? comparedFunds : [selectedFund];
  const recommendedFund = [...recommendationPool].sort((first, second) => {
    const score = (fund) => Number.parseFloat(fund.return5y) * 2 - Number.parseFloat(fund.expense) * 3 - Number.parseFloat(fund.maxDrawdown.replace("-", ""));
    return score(second) - score(first);
  })[0];
  const recommendationReasons = [
    `${recommendedFund.return5y} 5Y annualised return in this comparison`,
    `${recommendedFund.expense} expense ratio`,
    `${recommendedFund.maxDrawdown} illustrative maximum drawdown`,
    `${recommendedFund.risk} risk profile matches a long-term growth shortlist`,
  ];

  function toggleCompare(fundId) {
    setCompareFundIds((current) => {
      const next = current.includes(fundId)
        ? current.filter((id) => id !== fundId)
        : current.length < 3 ? [...current, fundId] : current;
      if (!current.includes(fundId) && current.length < 3) {
        window.setTimeout(() => document.getElementById("fund-comparison")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
      }
      return next;
    });
  }

  async function loadGuides() {
    setLoading(true);
    setLoadError("");
    try {
      const params = {};
      if (vertical) params.vertical = vertical;
      if (maxPrice) params.max_price = maxPrice;
      const { data } = await api.get("/guides", { params });
      setGuides(data);
    } catch (err) {
      setLoadError(err.response?.data?.error || "We couldn't load the directory right now.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMarketData() {
    setMarketLoading(true);
    setMarketError("");
    try {
      let data;
      if (import.meta.env.DEV) {
        const results = await Promise.all(MARKET_SYMBOLS.map(async ({ symbol, name, kind }) => {
          const response = await fetch(`/market-feed/${encodeURIComponent(symbol)}?range=5d&interval=1d`);
          if (!response.ok) throw new Error(`Market data request failed for ${symbol}`);
          const result = (await response.json()).chart?.result?.[0];
          const meta = result?.meta;
          const price = typeof (meta?.regularMarketPrice ?? meta?.previousClose) === "number" ? (meta.regularMarketPrice ?? meta.previousClose) : null;
          const previousClose = typeof (meta?.chartPreviousClose ?? meta?.previousClose) === "number" ? (meta.chartPreviousClose ?? meta.previousClose) : null;
          const change = price !== null && previousClose !== null ? price - previousClose : null;
          return { symbol, name, kind, price, change, changePercent: change !== null && previousClose ? (change / previousClose) * 100 : null, currency: meta?.currency || "INR" };
        }));
        data = { updatedAt: new Date().toISOString(), source: "Yahoo Finance public chart feed", quotes: results };
      } else {
        ({ data } = await api.get("/market/snapshot"));
      }
      setMarketData(data);
    } catch (err) {
      setMarketError(err.response?.data?.error || "Live market data is temporarily unavailable.");
    } finally {
      setMarketLoading(false);
    }
  }

  useEffect(() => {
    loadGuides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, maxPrice]);

  useEffect(() => {
    if (!investmentOpen) return undefined;
    loadMarketData();
    const refreshTimer = window.setInterval(loadMarketData, 60 * 60 * 1000);
    return () => window.clearInterval(refreshTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investmentOpen]);

  const visibleGuides = guides.filter((guide) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${guide.name} ${guide.bio} ${verticalLabel(guide.vertical)}`
      .toLowerCase()
      .includes(query);
  });

  const runway = monthlyNeeds > 0 ? (savings / monthlyNeeds).toFixed(1) : "0.0";
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, Math.round(((monthlyIncome - monthlyNeeds) / monthlyIncome) * 100))
    : 0;
  const sipMonths = sipYears * 12;
  const monthlySipRate = sipRate / 100 / 12;
  const sipValue = monthlySipRate > 0
    ? sipAmount * ((Math.pow(1 + monthlySipRate, sipMonths) - 1) / monthlySipRate) * (1 + monthlySipRate)
    : sipAmount * sipMonths;
  const sipInvested = sipAmount * sipMonths;
  const loanMonths = loanYears * 12;
  const monthlyLoanRate = loanRate / 100 / 12;
  const emi = monthlyLoanRate > 0
    ? loanAmount * monthlyLoanRate * Math.pow(1 + monthlyLoanRate, loanMonths) / (Math.pow(1 + monthlyLoanRate, loanMonths) - 1)
    : loanAmount / loanMonths;
  const plannerSurplus = Math.max(0, plannerAnswers.income - plannerAnswers.expenses);
  const plannerMonths = plannerAnswers.expenses > 0
    ? plannerAnswers.savings / plannerAnswers.expenses
    : 0;
  const debtPressure = plannerAnswers.debt === "high" ? "high" : plannerAnswers.debt === "some" ? "medium" : "low";
  const plannerPlan = (() => {
    const priorities = [];
    if (plannerMonths < 3) priorities.push({ title: "Build your safety buffer", text: `Aim for ${formatINR(plannerAnswers.expenses * 3)} before increasing investment risk.` });
    if (debtPressure !== "low") priorities.push({ title: "Reduce expensive debt", text: "Prioritise high-interest balances before adding more long-term investments." });
    if (plannerAnswers.goal === "home") priorities.push({ title: "Create a home fund", text: "Separate your down-payment target from your emergency savings and review affordability carefully." });
    if (plannerAnswers.goal === "growth") priorities.push({ title: "Invest consistently", text: "Use a diversified, long-term approach and review your risk level as your timeline changes." });
    if (plannerAnswers.goal === "stability") priorities.push({ title: "Protect your baseline", text: "Keep essential expenses visible, strengthen your buffer, and review insurance needs." });
    if (priorities.length === 0) priorities.push({ title: "Keep the system simple", text: "Automate your monthly plan, review it quarterly, and change one priority at a time." });
    const bufferTarget = plannerAnswers.expenses * (plannerAnswers.timeline === "fast" ? 6 : 3);
    const bufferGap = Math.max(0, bufferTarget - plannerAnswers.savings);
    const bufferAllocation = Math.min(plannerSurplus, Math.max(0, bufferGap / 12));
    const growthAllocation = Math.max(0, plannerSurplus - bufferAllocation);
    return { priorities, bufferTarget, bufferGap, bufferAllocation, growthAllocation };
  })();

  const pathwayDetails = {
    career: {
      eyebrow: "Career direction, explained",
      title: "Build a career decision you can stand behind.",
      description: "Career guidance is not only for finding a job. It helps you understand your strengths, compare opportunities, prepare for important conversations, and make a move without losing sight of your long-term life.",
      why: "The job market moves quickly across technology, startups, services, government, and remote work. A higher salary is not always a better move if the role, manager, learning curve, location, or stability does not fit your life.",
      practices: ["Write down your non-negotiables before comparing offers.", "Separate short-term salary from long-term skill and role growth.", "Prepare evidence of your impact before interviews or salary discussions.", "Ask a Guide to challenge your assumptions, not make the decision for you."],
    },
    finance: {
      eyebrow: "Financial clarity, explained",
      title: "Turn income into freedom and resilience.",
      description: "Personal finance guidance helps you understand the system around your money: cash flow, protection, taxes, savings, investing, and the trade-offs behind major life choices.",
      why: "Your salary is only one part of financial security. Rent or home loans, family responsibilities, health costs, taxes, inflation, and irregular income all shape how much freedom you really have.",
      practices: ["Build an emergency fund before taking more investment risk.", "Review EPF, PPF, NPS, insurance, and tax choices as separate decisions.", "Use a monthly plan based on take-home income, not headline CTC.", "Never invest in a product you cannot explain, and verify regulated advice."],
    },
  };
  const activePath = pathwayDetails[selectedPath];

  return (
    <div className="directory-page">
      <section className="directory-hero">
        <div className="hero-copy">
          <h1>The smart decisions you make today can fund the freedom you want tomorrow.</h1>
          <p className="hero-lede">
            1-on-1 human guidance for your critical career moves and personal
            finance decisions. Share your context with a verified Guide and walk
            away with a clear, actionable plan.
          </p>
        </div>
        <div className="hero-card">
          <span className="hero-card-label">Begin with what matters</span>
          <strong>Start with the question you cannot answer alone.</strong>
          <p>Choose a relevant Guide, share your context, and leave with a clearer set of options and next steps.</p>
          <div className="hero-mark" aria-hidden="true">↗</div>
        </div>
      </section>

      <section className="pathways-section" aria-labelledby="pathways-title">
        <div className="section-intro">
          <h2 id="pathways-title">Choose the conversation that fits your decision.</h2>
          <p>Different decisions need different perspectives. Select a path, understand the essentials, and connect with someone who has relevant experience.</p>
        </div>
        <div className="pathway-grid">
          <a className={`pathway-card career-path ${selectedPath === "career" ? "selected" : ""}`} href="#pathway-detail" onClick={() => { setSelectedPath("career"); setVertical("career"); }}>
            <span className="pathway-number">01</span>
            <div className="pathway-icon">↗</div>
            <h3>Work and career</h3>
            <p>Stop guessing your market worth. Get candid feedback on job offers, compensation ranges, and promotion strategies from experienced practitioners.</p>
            <span className="pathway-list">Job switches · Interviews · Negotiation</span>
            <span className="pathway-link">Meet career Guides <span aria-hidden="true">→</span></span>
          </a>
          <a className={`pathway-card finance-path ${selectedPath === "finance" ? "selected" : ""}`} href="#pathway-detail" onClick={() => { setSelectedPath("finance"); setVertical("finance"); }}>
            <span className="pathway-number">02</span>
            <div className="pathway-icon">₹</div>
            <h3>Money and planning</h3>
            <p>No financial jargon or product sales pitches. Build a practical roadmap for your cash flow, taxes (EPF, PPF, NPS), and long-term security.</p>
            <span className="pathway-list">Cash flow · Tax · Future planning</span>
            <span className="pathway-link">Meet finance Guides <span aria-hidden="true">→</span></span>
          </a>
        </div>
        {activePath && <article className="pathway-detail" id="pathway-detail">
          <div className="pathway-detail-lead">
            <p className="eyebrow">{activePath.eyebrow}</p>
            <h3>{activePath.title}</h3>
            <p>{activePath.description}</p>
          </div>
          <div className="pathway-detail-info">
            <div><span className="detail-label">Why it matters</span><p>{activePath.why}</p></div>
            <div><span className="detail-label">Good practice</span><ul>{activePath.practices.map((practice) => <li key={practice}>{practice}</li>)}</ul></div>
          </div>
        </article>}
      </section>

      <section className="focus-section" aria-labelledby="focus-title">
        <div className="focus-heading">
          <div>
            <p className="eyebrow">Start with the real question</p>
            <h2 id="focus-title">What are you working through?</h2>
          </div>
          <p>Choose a starting point. You can refine the conversation once you find a Guide.</p>
        </div>
        <div className="focus-grid">
          {focusAreas.map((area) => (
            <a
              className={`focus-item ${selectedFocus === area.id ? "selected" : ""}`}
              href={user ? "#focus-detail" : "/login"}
              key={area.label}
              onClick={() => { setSelectedFocus(area.id); setFocusAnswer(Object.keys(area.options)[0]); setVertical(area.vertical); setSelectedPath(area.vertical); setInvestmentOpen(area.id === "sip"); if (area.id === "sip") setTimeout(() => document.getElementById("investment-lab")?.scrollIntoView({ behavior: "smooth" }), 0); }}
            >
              <span className="focus-item-arrow" aria-hidden="true">↗</span>
              <strong>{area.label}</strong>
              <span>{area.detail}</span>
            </a>
          ))}
        </div>
        {activeFocus && <div className="focus-detail" id="focus-detail">
          <div className="focus-detail-heading"><span className="eyebrow">Self-serve starting point</span><h3>{activeFocus.label}</h3><p>{activeFocus.question}</p></div>
          <div className="focus-options">{Object.entries(activeFocus.options).map(([value, label]) => <button className={focusAnswer === value ? "active" : ""} key={value} onClick={() => setFocusAnswer(value)}>{label}</button>)}</div>
          <div className="focus-recommendation"><span className="detail-label">Your first recommendation</span><p>{focusRecommendation}</p><a href={user ? "#directory" : "/login"} onClick={() => { setVertical(activeFocus.vertical); setSelectedPath(activeFocus.vertical); }}>Explore {activeFocus.vertical === "career" ? "career" : "finance"} Guides <span aria-hidden="true">↗</span></a></div>
        </div>}
      </section>

      <section className="toolkit-section smart-desk" aria-labelledby="toolkit-title">
        <div className="toolkit-copy">
          <p className="eyebrow">Before you make a money decision</p>
          <h2 id="toolkit-title">Run the math first. Talk through the reality second.</h2>
          <p>Use our private, zero-tracking estimators to calculate your runway—then bring your numbers to a Guide to pressure-test your plan.</p>
          <a className="toolkit-link" href="#directory" onClick={() => setVertical("finance")}>Talk through your plan <span aria-hidden="true">↗</span></a>
        </div>
        <div className="planning-panel">
          <div className="tool-tabs" role="tablist" aria-label="Planning calculators">
            <button className={toolMode === "runway" ? "active" : ""} onClick={() => setToolMode("runway")} role="tab">Safety runway</button>
            <button className={toolMode === "sip" ? "active" : ""} onClick={() => setToolMode("sip")} role="tab">SIP growth</button>
            <button className={toolMode === "emi" ? "active" : ""} onClick={() => setToolMode("emi")} role="tab">Loan EMI</button>
          </div>
          {toolMode === "runway" && <div className="calculator-body">
            <div className="calculator-result"><strong>{runway}</strong><span>months of runway</span><small>Saving rate: {savingsRate}%</small></div>
            <div className="toolkit-controls compact-controls">
              <label>Monthly take-home income <output>{formatINR(monthlyIncome)}</output><input type="range" min="10000" max="500000" step="5000" value={monthlyIncome} onChange={(e) => setMonthlyIncome(Number(e.target.value))} /></label>
              <label>Essential monthly needs <output>{formatINR(monthlyNeeds)}</output><input type="range" min="5000" max="300000" step="2500" value={monthlyNeeds} onChange={(e) => setMonthlyNeeds(Number(e.target.value))} /></label>
              <label>Accessible savings <output>{formatINR(savings)}</output><input type="range" min="0" max="5000000" step="25000" value={savings} onChange={(e) => setSavings(Number(e.target.value))} /></label>
            </div>
          </div>}
          {toolMode === "sip" && <div className="calculator-body">
            <div className="calculator-result"><strong>{formatINR(sipValue)}</strong><span>estimated future value</span><small>Estimated gain: {formatINR(Math.max(0, sipValue - sipInvested))}</small></div>
            <div className="toolkit-controls compact-controls">
              <label>Monthly SIP <output>{formatINR(sipAmount)}</output><input type="range" min="500" max="200000" step="500" value={sipAmount} onChange={(e) => setSipAmount(Number(e.target.value))} /></label>
              <label>Expected annual return <output>{sipRate}%</output><input type="range" min="1" max="25" step="0.5" value={sipRate} onChange={(e) => setSipRate(Number(e.target.value))} /></label>
              <label>Investment period <output>{sipYears} years</output><input type="range" min="1" max="40" step="1" value={sipYears} onChange={(e) => setSipYears(Number(e.target.value))} /></label>
            </div>
          </div>}
          {toolMode === "emi" && <div className="calculator-body">
            <div className="calculator-result"><strong>{formatINR(emi)}</strong><span>estimated monthly EMI</span><small>Total repayment: {formatINR(emi * loanMonths)}</small></div>
            <div className="toolkit-controls compact-controls">
              <label>Loan amount <output>{formatINR(loanAmount)}</output><input type="range" min="100000" max="10000000" step="50000" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} /></label>
              <label>Annual interest rate <output>{loanRate}%</output><input type="range" min="1" max="20" step="0.1" value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))} /></label>
              <label>Loan period <output>{loanYears} years</output><input type="range" min="1" max="30" step="1" value={loanYears} onChange={(e) => setLoanYears(Number(e.target.value))} /></label>
            </div>
          </div>}
          <p className="calculator-disclaimer">Illustrative estimate only. Returns, rates, taxes, and eligibility vary. Speak with a qualified professional before acting.</p>
        </div>
      </section>

      {investmentOpen && <section className="investment-lab" id="investment-lab" aria-labelledby="investment-title">
        <div className="investment-lab-heading">
          <div>
            <p className="eyebrow">SIP and investing, made legible</p>
            <h2 id="investment-title">Choose a fund with the full picture in view.</h2>
            <p>Compare category, risk, costs, and long-term history before you set a contribution. Past performance is context, not a promise.</p>
          </div>
          <div className="investment-signal"><span className="signal-dot" />Research mode <span>·</span> No execution</div>
        </div>

        <div className="market-research">
          <div className="market-research-heading"><div><span className="detail-label">Live market pulse</span><h3>Know the backdrop before choosing a SIP.</h3></div><span className="market-updated">{marketLoading ? "Updating…" : marketData ? `Updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(marketData.updatedAt))}` : "Waiting for data"}</span></div>
          {marketError ? <div className="market-message error">{marketError} <button type="button" onClick={loadMarketData}>Retry</button></div> : marketLoading && !marketData ? <div className="market-message">Fetching current index and ETF quotes…</div> : <>
            <div className="market-quote-grid">{(marketData?.quotes || []).map((quote) => <div className="market-quote" key={quote.symbol}><span>{quote.name}</span><strong>{quote.kind === "index" ? "₹" : "₹"}{formatMarketValue(quote)}</strong><small className={quote.changePercent >= 0 ? "positive" : "negative"}>{formatMarketChange(quote)}</small></div>)}</div>
            <div className="market-research-note"><strong>{marketData?.partial ? "Some quotes are delayed or unavailable." : marketData?.stale ? "Showing the last successful snapshot." : "What this means"}</strong><span>Use one day of movement as context, not a reason to start or stop a long-term SIP. Compare goals, time horizon, diversification, costs, and downside tolerance first.</span><span className="market-source">Source: {marketData?.source || "public market feed"}</span></div>
          </>}
        </div>

        <div className="investment-layout">
          <div className="fund-explorer">
            <div className="fund-toolbar">
              <span className="detail-label">Explore {filteredFunds.length} of {INVESTMENT_FUNDS.length} research funds</span>
              <div className="fund-filters" role="group" aria-label="Filter funds by risk">
                {["All funds", "Mutual Fund", "ETF"].map((vehicle) => <button type="button" className={fundVehicleFilter === vehicle ? "active" : ""} key={vehicle} onClick={() => setFundVehicleFilter(vehicle)}>{vehicle === "All funds" ? "All" : vehicle === "Mutual Fund" ? "Mutual funds" : "ETFs"}</button>)}
                {["All", "Low", "Moderate", "High"].map((risk) => <button type="button" className={fundFilter === risk ? "active" : ""} key={risk} onClick={() => setFundFilter(risk)}>{risk}</button>)}
              </div>
            </div>
            <div className="fund-search-controls">
              <input type="search" aria-label="Search funds" placeholder="Search fund or category" value={fundSearch} onChange={(e) => setFundSearch(e.target.value)} />
              <select aria-label="Filter by fund house" value={fundHouseFilter} onChange={(e) => setFundHouseFilter(e.target.value)}><option>All fund houses</option>{FUND_HOUSES.map((house) => <option key={house}>{house}</option>)}</select>
            </div>
            <div className="fund-list">
              {filteredFunds.length === 0 ? <div className="fund-empty">No funds match these filters. Try another house, category, or risk level.</div> : filteredFunds.map((fund) => <div className={`fund-row ${selectedFund.id === fund.id ? "selected" : ""}`} key={fund.id}>
                <span className="fund-icon">↗</span>
                <span className="fund-name"><strong>{fund.name}</strong><small>{fund.vehicle} · {fund.house} · {fund.type}</small></span>
                <span className="fund-risk">{fund.risk}<small>risk</small></span>
                <span className="fund-return">{fund.return5y}<small>5Y annualised</small></span>
                <button type="button" className="fund-select-button" onClick={() => setSelectedFundId(fund.id)}>View</button>
                <button type="button" className={`compare-button ${compareFundIds.includes(fund.id) ? "active" : ""}`} aria-pressed={compareFundIds.includes(fund.id)} onClick={(event) => { event.stopPropagation(); toggleCompare(fund.id); }}>{compareFundIds.includes(fund.id) ? "Compared" : "Compare"}</button>
              </div>)}
            </div>
          </div>

          <div className="fund-detail">
            <div className="fund-detail-top"><div><span className="detail-label">Selected {selectedFund.vehicle.toLowerCase()} · {selectedFund.house}</span><h3>{selectedFund.name}</h3><p>{selectedFund.type} · NAV {selectedFund.nav} · Launched {selectedFund.inception}</p></div><span className={`risk-pill ${selectedFund.risk.toLowerCase()}`}>{selectedFund.risk} risk</span></div>
            <div className="history-chart" aria-label="Illustrative five year performance history">
              {selectedFund.history.map((height, index) => <span key={`${selectedFund.id}-${index}`} style={{ height: `${height}%` }} />)}
              <div className="chart-labels"><span>5Y ago</span><span>Today</span></div>
            </div>
            <div className="fund-calculator"><div className="fund-calculator-result"><span className="detail-label">SIP projection</span><strong>{formatINR(fundProjectedValue)}</strong><small>Estimated value after {fundSipYears} years · Gain {formatINR(Math.max(0, fundProjectedValue - fundInvestedValue))}</small></div><div className="fund-calculator-controls"><label>Monthly SIP <output>{formatINR(investmentAmount)}</output><input type="range" min="500" max="100000" step="500" value={investmentAmount} onChange={(e) => setInvestmentAmount(Number(e.target.value))} /></label><label>Expected annual return <output>{fundSipRate}%</output><input type="range" min="1" max="25" step="0.5" value={fundSipRate} onChange={(e) => setFundSipRate(Number(e.target.value))} /></label><label>Time horizon <output>{fundSipYears} years</output><input type="range" min="1" max="40" step="1" value={fundSipYears} onChange={(e) => setFundSipYears(Number(e.target.value))} /></label></div></div>
            <div className="fund-detail-section"><span className="detail-label">Past performance</span><div className="performance-table"><div><span>1Y</span><strong>{selectedFund.return1y}</strong></div><div><span>3Y CAGR</span><strong>{selectedFund.return3y}</strong></div><div><span>5Y CAGR</span><strong>{selectedFund.return5y}</strong></div><div><span>Since inception</span><strong>{selectedFund.sinceInception}</strong></div></div></div>
            <div className="fund-metrics"><div><span>Expense ratio</span><strong>{selectedFund.expense}</strong></div><div><span>Volatility</span><strong>{selectedFund.volatility}</strong></div><div><span>Max drawdown</span><strong>{selectedFund.maxDrawdown}</strong></div><div><span>AUM</span><strong>{selectedFund.aum}</strong></div><div><span>Benchmark</span><strong>{selectedFund.benchmark}</strong></div><div><span>Min SIP</span><strong>₹500</strong></div></div>
            <div className="fund-detail-section holdings-section"><div className="holdings-heading"><span className="detail-label">Top holdings</span><small>Portfolio snapshot</small></div>{selectedFund.holdings.map((holding) => <div className="holding-row" key={holding.name}><span>{holding.name}</span><strong>{holding.weight}</strong><i><b style={{ width: holding.weight }} /></i></div>)}</div>
            <div className="fund-research-grid"><div className="fund-detail-section manager-section"><span className="detail-label">Fund manager and background</span><h4>{selectedFund.manager.name}</h4><p><strong>Experience:</strong> {selectedFund.manager.experience}</p><p><strong>Background:</strong> {selectedFund.manager.background}</p><small>Source status: {selectedFund.manager.source}</small></div><div className="fund-detail-section manager-section"><div className="holdings-heading"><span className="detail-label">Fund flows</span><small>Quarterly snapshot</small></div><div className="flow-list">{selectedFund.flows.map((flow) => <div key={flow.period}><span>{flow.period}</span><strong>{flow.value}</strong><i><b style={{ width: `${Math.min(100, parseInt(flow.value.replace(/\D/g, ""), 10) * 2)}%` }} /></i></div>)}</div></div></div>
            <div className="compliance-panel"><span className="detail-label">Regulatory and reputation checks</span><strong>Verified allegations data not connected</strong><p>No fraud, misconduct, or legal-history conclusion is made here. Check SEBI orders, exchange notices, scheme disclosures, court records, and the fund house’s official filings before relying on a manager or fund profile.</p><small>Evidence status: pending verified source integration</small><div className="research-links"><a href="https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes" target="_blank" rel="noreferrer">SEBI orders and enforcement ↗</a><a href="https://portal.amfiindia.com/spages/NAVAll.txt" target="_blank" rel="noreferrer">AMFI NAV file ↗</a><a href="https://www.nseindia.com/market-data/exchange-traded-funds-etf" target="_blank" rel="noreferrer">NSE ETF market data ↗</a></div></div>
            <div className="sip-setup"><div><span className="detail-label">Set your contribution</span><label htmlFor="investment-amount">Monthly amount <output>{formatINR(investmentAmount)}</output></label><input id="investment-amount" type="range" min="500" max="100000" step="500" value={investmentAmount} onChange={(e) => setInvestmentAmount(Number(e.target.value))} /></div><label htmlFor="investment-frequency">Frequency<select id="investment-frequency" value={investmentFrequency} onChange={(e) => setInvestmentFrequency(e.target.value)}><option>Monthly</option><option>Quarterly</option></select></label></div>
            <div className="investment-review"><span><strong>{formatINR(investmentAmount)}</strong> / {investmentFrequency.toLowerCase()} SIP</span><button type="button" onClick={() => setInvestmentOpen(false)}>Save this shortlist <span aria-hidden="true">↗</span></button></div>
          </div>
        </div>
        <div className="comparison-panel" id="fund-comparison"><div className="comparison-heading"><div><span className="detail-label">Compare and select</span><h3>Make the shortlist earn its place.</h3></div><span>{comparedFunds.length}/3 selected</span></div>{comparedFunds.length === 0 ? <p>Select up to three funds from the catalogue to compare them. The recommendation will explain its choice using the visible metrics.</p> : <><div className="comparison-table"><div className="comparison-table-head"><span>Fund</span><span>5Y CAGR</span><span>Cost</span><span>Risk</span><span>Drawdown</span></div>{comparedFunds.map((fund) => <div className={`comparison-table-row ${recommendedFund.id === fund.id ? "recommended" : ""}`} key={fund.id}><strong>{fund.name}</strong><span>{fund.return5y}</span><span>{fund.expense}</span><span>{fund.risk}</span><span>{fund.maxDrawdown}</span></div>)}</div><div className="recommendation-box"><span className="detail-label">Recommendation for this shortlist</span><h4>{recommendedFund.name}</h4><p>This is the strongest fit among the selected funds based on the current comparison, not a guaranteed winner.</p><ul>{recommendationReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><small>Verify official factsheets, current NAV, portfolio, taxation, and suitability before investing.</small></div></>}</div>
        <p className="investment-disclaimer">Catalogue includes {INVESTMENT_FUNDS.length} research entries across {FUND_HOUSES.length} fund houses. Performance figures shown here are illustrative research estimates until a licensed NAV and factsheet provider is connected. Always verify the latest scheme document, benchmark, tracking difference, exit load, taxation, and suitability before investing.</p>
      </section>}

      {false && <section className="planner-section" aria-labelledby="planner-title">
        <div className="planner-heading">
          <div>
            <p className="eyebrow">Build a first plan</p>
            <h2 id="planner-title">Build your baseline plan in 60 seconds.</h2>
          </div>
        </div>
        <div className="planner-layout">
          <div className="planner-form">
            <label>What are you planning for?
              <select value={plannerAnswers.goal} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, goal: e.target.value })}>
                <option value="stability">More financial stability</option>
                <option value="growth">Long-term wealth building</option>
                <option value="home">A home or major purchase</option>
              </select>
            </label>
            <label>Monthly take-home income
              <input type="number" min="0" value={plannerAnswers.income} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, income: Number(e.target.value) })} />
            </label>
            <label>Essential monthly expenses
              <input type="number" min="0" value={plannerAnswers.expenses} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, expenses: Number(e.target.value) })} />
            </label>
            <label>Accessible savings
              <input type="number" min="0" value={plannerAnswers.savings} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, savings: Number(e.target.value) })} />
            </label>
            <label>Current debt level
              <select value={plannerAnswers.debt} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, debt: e.target.value })}>
                <option value="none">No high-interest debt</option>
                <option value="some">Some loans or credit balances</option>
                <option value="high">High-interest debt to prioritise</option>
              </select>
            </label>
            <label>How quickly do you need more flexibility?
              <select value={plannerAnswers.timeline} onChange={(e) => setPlannerAnswers({ ...plannerAnswers, timeline: e.target.value })}>
                <option value="steady">I can build steadily</option>
                <option value="fast">I need a stronger buffer soon</option>
              </select>
            </label>
          </div>
          <div className="planner-result">
            <div className="planner-result-top"><span className="eyebrow">Your starting plan</span><strong>{formatINR(plannerSurplus)} available monthly</strong></div>
            <div className="planner-metrics"><div><span>Current runway</span><strong>{plannerMonths.toFixed(1)} mo</strong></div><div><span>Safety target</span><strong>{formatINR(plannerPlan.bufferTarget)}</strong></div></div>
            <div className="planner-priorities">{plannerPlan.priorities.map((priority, index) => <div className="planner-priority" key={priority.title}><span>0{index + 1}</span><div><strong>{priority.title}</strong><p>{priority.text}</p></div></div>)}</div>
            <div className="planner-allocation"><span>Suggested next-month allocation</span><div><strong>{formatINR(plannerPlan.bufferAllocation)}</strong> safety buffer <strong>{formatINR(plannerPlan.growthAllocation)}</strong> longer-term goals</div></div>
            <div className="planner-tools"><span>Continue planning</span><div><button type="button" onClick={() => { setToolMode("sip"); document.getElementById("toolkit-title")?.scrollIntoView({ behavior: "smooth" }); }}>Calculate SIP growth <span aria-hidden="true">↗</span></button><button type="button" onClick={() => { setToolMode("emi"); document.getElementById("toolkit-title")?.scrollIntoView({ behavior: "smooth" }); }}>Estimate loan EMI <span aria-hidden="true">↗</span></button></div></div>
          </div>
        </div>
      </section>}

      {user ? <>
      <div className="directory-heading" id="directory">
        <div>
          <p className="eyebrow">The Guide directory</p>
          <h2>Meet people with relevant experience.</h2>
        </div>
        <div className="directory-summary">
          <span className="result-count">{guides.length} {guides.length === 1 ? "Guide" : "Guides"} available</span>
          <span className="summary-divider" aria-hidden="true" />
          <span className="result-count">Text-based sessions</span>
        </div>
      </div>

      <div className="filters directory-filters">
        <div className="filter-field search-field">
          <label htmlFor="guide-search">Search the directory</label>
          <div className="input-with-icon">
            <span aria-hidden="true">⌕</span>
            <input
              id="guide-search"
              type="search"
              placeholder="Name, topic, or focus"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-field">
          <label htmlFor="vertical-filter">Vertical</label>
          <select
            id="vertical-filter"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          >
            {VERTICALS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="max-price-filter">Max hourly rate</label>
          <input
            id="max-price-filter"
            type="number"
            placeholder="e.g. 2,000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><span className="loading-pulse" /> Curating the directory…</div>
      ) : loadError ? (
        <div className="empty-state error-state">
          <span className="empty-icon">!</span>
          <h3>The directory took a wrong turn</h3>
          <p>{loadError}</p>
          <button type="button" className="retry-button" onClick={loadGuides}>Try again</button>
        </div>
      ) : visibleGuides.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">○</span>
          <h3>No exact match yet</h3>
          <p>Try a broader search or remove a filter. The right conversation may be one word away.</p>
        </div>
      ) : (
        <div className="guide-grid">
          {visibleGuides.map((g, index) => (
            <Link to={`/guides/${g.id}`} key={g.id} className="card guide-card">
              <div className="guide-card-top">
                <div className={`avatar avatar-${index % 4}`}>{getInitials(g.name)}</div>
                <div className="guide-card-heading">
                  <div className="guide-name-row">
                    <h3>{g.name}</h3>
                    <span className="availability-dot" title="Available for new sessions" />
                  </div>
                  <span className={`vertical-tag ${g.vertical}`}>
                    {verticalLabel(g.vertical)}
                  </span>
                </div>
              </div>
              <div className="guide-meta-row">
                <span className="rate">{formatINR(g.hourly_rate)}/session</span>
                <span>
                  {g.avg_rating ? `★ ${g.avg_rating}` : "New Guide"}
                  {g.review_count ? ` (${g.review_count})` : ""}
                </span>
              </div>
              <p className="bio-preview">{g.bio}</p>
              <span className="card-action">View profile <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      )}

      <section className="connection-section" aria-labelledby="connection-title">
        <div className="connection-heading">
          <p className="eyebrow">A different kind of network</p>
          <h2 id="connection-title">Find context, not more content.</h2>
        </div>
        <div className="connection-steps">
          <div><span>01</span><h3>Bring the real situation</h3><p>Start with the decision, constraint, or question you are actually facing.</p></div>
          <div><span>02</span><h3>Choose relevant experience</h3><p>Compare Guides by focus, background, rate, and the kind of help they offer.</p></div>
          <div><span>03</span><h3>Leave with a next step</h3><p>Use a private text session to turn a complicated situation into an actionable plan.</p></div>
        </div>
      </section>
      </> : <section className="member-gate" id="directory">
        <div className="member-gate-mark">✳</div>
        <p className="eyebrow">Member access</p>
        <h2>Relevant perspective starts with one question.</h2>
        <p>Sign in to explore independent Guides, compare their experience, and start a private text session built around your situation.</p>
        <div className="member-gate-actions">
          <Link className="portal-button" to="/login">Log in to explore</Link>
          <Link className="member-gate-link" to="/register">Create a free account <span aria-hidden="true">↗</span></Link>
        </div>
        <p className="member-gate-note">Private &amp; zero-spam. Pay per session with no long-term subscriptions.</p>
      </section>}

      <section className="directory-footer-note" id="our-standard">
        <div className="footer-note-mark">✳</div>
        <div>
          <p className="eyebrow">Our point of view</p>
          <h3>A network built for decisions, not scrolling.</h3>
          <p>Whether you are navigating a job change or optimizing your tax strategy, you bring the question—verified industry practitioners bring relevant experience. No algorithms, no product pitches, just focused 1-on-1 context.</p>
        </div>
      </section>
    </div>
  );
}
