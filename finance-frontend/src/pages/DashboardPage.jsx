import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { fetchSpendingSummary, fetchDashboardSummary, fetchDashboardDynamicSummary, fetchCategorySpending } from "../api"

function DashboardPage({ accounts, balances }) {

    const navigate = useNavigate()

    const [spending, setSpending] = useState([])

    const [summary, setSummary] = useState(null)

    const [dynamic_summary, setDynamicSummary] = useState(null)

    const [category_spending, setCategorySpending] = useState(null)

    const today = new Date()

    const firstOfMonth = 
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        ).toISOString().split("T")[0]

    const todayString = 
        today.toISOString().split("T")[0]

    const [start_date, setStartDate] = useState(firstOfMonth)

    const [end_date, setEndDate] = useState(todayString)

    const netWorth = useMemo(() => {

        if (!balances) return 0

        return Object.values(balances)
            .reduce(
                (sum, val) => sum + Number(val || 0),
                0
            )

    }, [balances])

    const getPercent = (total, income, pct) => {
        if (income != 0 || total === 0) {
            return pct;
        }
        return null;
    };

    function openCategoryTransactions(categoryId) {
        if (!categoryId) return

        navigate(`/transactions?categoryId=${encodeURIComponent(categoryId)}`, {
            state: { fromDashboard: true, categoryId }
        })
    }
    

    async function loadDynamicSummary() {

        try {

            const data = 
                await fetchDashboardDynamicSummary(
                    start_date,
                    end_date
                )

            setDynamicSummary(data)

        } catch (error) {

            console.error(error)
        }
    }

    async function loadCategorySpending() {

        try {
            const data = await fetchCategorySpending(
                start_date,
                end_date
            )

            setCategorySpending(data)

        } catch (error) {

            console.error(error)
        }
    }


    useEffect(() => {

        async function load() {
            const data = await fetchSpendingSummary()
            setSpending(data)
        }

        load()

    }, [])

    useEffect(() => {

        loadDynamicSummary()

    }, [])

    useEffect(() => {
        loadCategorySpending()
    }, [])

    return (
        <div>

            <h1>Dashboard</h1>

            {/* NET WORTH
            <div style={{ marginBottom: "20px" }}>
                <h2>Cash Amount</h2>
                <h1>
                    ${netWorth.toFixed(2)}
                </h1>
            </div>

            <hr /> */}

            {/* DYNAMIC SPENDING SUMMARY */}
            <h2>Set Date Range</h2>
            <input
                type="date"
                value={start_date}
                onChange={(e) =>
                    setStartDate(e.target.value)
                }
            />

            <input
                type="date"
                value={end_date}
                onChange={(e) =>
                    setEndDate(e.target.value)
                }
            />

            <button 
                onClick={() => {
                    loadDynamicSummary()
                    loadCategorySpending()
                }}
            >
                Apply Date Range
            </button>

            <hr/>

            {dynamic_summary && (

                <div>

                    <h2>
                        Spending Summary
                    </h2>

                    

                    <p>
                        Income:
                        ${Math.abs(dynamic_summary.income).toFixed(2)}
                    </p>

                    <p>
                        Expenses:
                        ${Math.abs(dynamic_summary.expenses).toFixed(2)}
                    </p>

                    <p>
                        Savings:
                        ${Math.abs(dynamic_summary.savings).toFixed(2)}
                    </p>

                    <p>
                        Investments:
                        ${Math.abs(dynamic_summary.investments).toFixed(2)}
                    </p>

                    <p>
                        Surplus/Deficit:
                        ${dynamic_summary.surplus_deficit.toFixed(2)}
                    </p>

                </div>

            )}

            <hr />

            {category_spending && (
                <div>
                    <h2>Spending by Category</h2>

                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Reporting Group</th>
                                <th>Number of Months</th>
                                <th>Total</th>
                                <th>Average</th>
                                <th>Percentage of Income</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>Total Income</td>
                                <td>Income</td>
                                <td>{category_spending.months}</td>
                                <td>${category_spending.income.toFixed(2)}</td>
                                <td>${(category_spending.income / category_spending.months).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><hr/></td>
                                <td><hr/></td>
                            </tr>
                            {category_spending.categories
                                .filter(cat => cat.reporting_group === 'income')
                                .map(cat => (
                                    <tr
                                        key={cat.category_id}
                                        onClick={() => openCategoryTransactions(cat.category_id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                openCategoryTransactions(cat.category_id)
                                            }
                                        }}
                                        style={{ cursor: "pointer" }}
                                        tabIndex={0}
                                        role="link"
                                    >
                                        <td>
                                            {cat.category_name}
                                        </td>
                                        <td>
                                            {cat.reporting_group}
                                        </td>
                                        <td>
                                            {category_spending.months}
                                        </td>
                                        <td>
                                            ${cat.total.toFixed(2)}
                                        </td>
                                        <td>
                                            ${cat.avg_total.toFixed(2)}
                                        </td>
                                        <td>
                                            {getPercent(cat.total, category_spending.income, cat.pct_income) === null
                                                ? "N/A"
                                                : `${getPercent(cat.total, category_spending.income, cat.pct_income).toFixed(2)}%`
                                            }
                                        </td>
                                    </tr>
                            ))}
                            <tr>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                            </tr>
                            {category_spending.categories
                                .filter(cat => cat.reporting_group === 'expense')
                                .map(cat => (
                                    <tr
                                        key={cat.category_id}
                                        onClick={() => openCategoryTransactions(cat.category_id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                openCategoryTransactions(cat.category_id)
                                            }
                                        }}
                                        style={{ cursor: "pointer" }}
                                        tabIndex={0}
                                        role="link"
                                    >
                                        <td>
                                            {cat.category_name}
                                        </td>
                                        <td>
                                            {cat.reporting_group}
                                        </td>
                                        <td>
                                            {category_spending.months}
                                        </td>
                                        <td>
                                            ${cat.total.toFixed(2)}
                                        </td>
                                        <td>
                                            ${cat.avg_total.toFixed(2)}
                                        </td>
                                        <td>
                                            {getPercent(cat.total, category_spending.income, cat.pct_income) === null
                                                ? "N/A"
                                                : `${getPercent(cat.total, category_spending.income, cat.pct_income).toFixed(2)}%`
                                            }
                                        </td>
                                    </tr>
                            ))}
                            <tr>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                            </tr>
                            {category_spending.categories
                                .filter(cat => ['investments', 'savings'].includes(cat.reporting_group))
                                .map(cat => (
                                    <tr
                                        key={cat.category_id}
                                        onClick={() => openCategoryTransactions(cat.category_id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                openCategoryTransactions(cat.category_id)
                                            }
                                        }}
                                        style={{ cursor: "pointer" }}
                                        tabIndex={0}
                                        role="link"
                                    >
                                        <td>
                                            {cat.category_name}
                                        </td>
                                        <td>
                                            {cat.reporting_group}
                                        </td>
                                        <td>
                                            {category_spending.months}
                                        </td>
                                        <td>
                                            ${cat.total.toFixed(2)}
                                        </td>
                                        <td>
                                            ${cat.avg_total.toFixed(2)}
                                        </td>
                                        <td>
                                            {getPercent(cat.total, category_spending.income, cat.pct_income) === null
                                                ? "N/A"
                                                : `${getPercent(cat.total, category_spending.income, cat.pct_income).toFixed(2)}%`
                                            }
                                        </td>
                                    </tr>
                            ))}
                            <tr>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                                <td><hr/></td>
                            </tr>
                            <tr>
                                <td>Leftover</td>
                                <td></td>
                                <td>{category_spending.months}</td>
                                <td>${category_spending.leftover.toFixed(2)}</td>
                                <td>${(category_spending.leftover / category_spending.months).toFixed(2)}</td>
                                <td>{category_spending.income === 0 ? "N/A" : `${((category_spending.leftover / category_spending.income) * 100).toFixed(2)}%`}</td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            )}


            {/* ACCOUNTS SUMMARY */}
            <div>
                <h2>Accounts</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th>Type</th>
                            <th>Balance</th>
                        </tr>
                    </thead>

                    <tbody>
                        {accounts.map(acc => (
                            <tr key={acc.id}>
                                <td>
                                    {acc.name}
                                </td>
                                <td>
                                    {acc.type}
                                </td>
                                <td>
                                    {balances?.[acc.id] ?? 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <hr />

            {/* <h2>Spending by Category</h2>

            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>All Time</th>
                        <th>Avg Monthly</th>
                        <th>Current Month</th>
                    </tr>
                </thead>

                <tbody>
                    {spending.map(row => (
                        <tr key={row.category_id}>
                            <td>{row.category_name}</td>
                            <td>{row.all_time.toFixed(2)}</td>
                            <td>{row.avg_monthly.toFixed(2)}</td>
                            <td>{row.current_month.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table> */}

            <hr />

            {/* NAVIGATION */}
            <div>
                <h2>Navigation</h2>

                <ul>
                    <li><Link to="/accounts">Accounts</Link></li>
                    <li><Link to="/transactions">Transactions</Link></li>
                    <li><Link to="/categories-rules">Categories & Rules</Link></li>
                    <li><Link to="/import">Import</Link></li>
                    <li><Link to="/uncategorized">Uncategorized</Link></li>
                </ul>
            </div>

        </div>
    )
}

export default DashboardPage