import { Link, useNavigate } from "react-router-dom"
import { Fragment, useEffect, useMemo, useState } from "react"
import {
    fetchDashboardChartData,
    fetchDashboardDynamicSummary,
    fetchCategorySpending
} from "../api"
import toast from "react-hot-toast"

const today = new Date()

function toDateInputValue(date) {
    return date.toISOString().split("T")[0]
}

function firstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function lastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function getPresetRange(preset) {
    const currentMonth = firstDayOfMonth(today)

    if (preset === "previous_month") {
        const start = addMonths(currentMonth, -1)
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(lastDayOfMonth(start))
        }
    }

    if (preset === "last_3_months") {
        const start = addMonths(currentMonth, -2)
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(lastDayOfMonth(currentMonth))
        }
    }

    if (preset === "last_6_months") {
        const start = addMonths(currentMonth, -5)
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(lastDayOfMonth(currentMonth))
        }
    }

    if (preset === "year_to_date") {
        const start = new Date(today.getFullYear(), 0, 1)
        return {
            startDate: toDateInputValue(start),
            endDate: toDateInputValue(lastDayOfMonth(currentMonth))
        }
    }

    return {
        startDate: toDateInputValue(currentMonth),
        endDate: toDateInputValue(lastDayOfMonth(currentMonth))
    }
}

function formatMoney(amount, options = {}) {
    if (amount === null || amount === undefined) {
        return ""
    }

    const absAmount = Math.abs(Number(amount))
    const formatted = absAmount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
    })

    if (!options.signed) {
        return formatted
    }

    if (Number(amount) > 0) {
        return `+${formatted}`
    }

    if (Number(amount) < 0) {
        return `-${formatted}`
    }

    return formatted
}

function formatPercent(percent, options = {}) {
    if (percent === null || percent === undefined) {
        return ""
    }

    const absPercent = Math.abs(Number(percent))
    const formatted = `${absPercent.toFixed(0)}%`

    if (!options.signed) {
        return formatted
    }

    if (Number(percent) > 0) {
        return `+${formatted}`
    }

    if (Number(percent) < 0) {
        return `-${formatted}`
    }

    return formatted
}

function formatCompactMoney(amount) {
    if (amount === null || amount === undefined) {
        return ""
    }

    const value = Number(amount)

    if (Math.abs(value) >= 1000) {
        return value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1
        })
    }

    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    })
}

function getFavorability(category, diffPercent) {
    if (!diffPercent) {
        return "neutral"
    }

    if (["savings", "investments", "income"].includes(category.reporting_group)) {
        return diffPercent > 0 ? "good" : "bad"
    }

    return diffPercent < 0 ? "good" : "bad"
}

function getDiffStyle(category, diffPercent) {
    if (diffPercent === null || diffPercent === undefined) {
        return {}
    }

    const favorability = getFavorability(category, diffPercent)

    if (favorability === "neutral") {
        return {}
    }

    const intensity = Math.min(Math.abs(diffPercent) / 35, 1)
    const alpha = 0.08 + (intensity * 0.22)
    const color = favorability === "good"
        ? `rgba(28, 121, 76, ${alpha})`
        : `rgba(188, 71, 73, ${alpha})`

    return {
        backgroundColor: color
    }
}

function getGroupLabel(group) {
    const labels = {
        income: "Income",
        expense: "Expenses",
        savings: "Savings",
        investments: "Investments"
    }

    return labels[group] || group
}

function shouldShowCategory(category) {
    const hasExpected = category.target_amount !== null
        && category.target_amount !== undefined
        && Math.abs(Number(category.target_amount)) > 0
    const hasActual = Math.abs(Number(category.total)) > 0

    return hasExpected || hasActual
}

function getCategoryColor(index) {
    const colors = [
        "#2f6f73",
        "#b85c38",
        "#5f6fb8",
        "#8a6a2f",
        "#7a4c8f",
        "#397a4f"
    ]

    return colors[index % colors.length]
}

function buildLinePoints(series, maxTotal) {
    if (!series.length) {
        return ""
    }

    if (series.length === 1) {
        const y = getChartY(series[0].total, maxTotal)
        return `40,${y} 320,${y}`
    }

    return series
        .map((point, index) => {
            const x = 40 + ((index / (series.length - 1)) * 280)
            const y = getChartY(point.total, maxTotal)

            return `${x},${y}`
        })
        .join(" ")
}

function getChartY(total, maxTotal) {
    return 190 - ((Number(total) / maxTotal) * 160)
}

function clampChartY(y) {
    return Math.max(22, Math.min(202, y))
}

function getChartReferenceY(total, maxTotal) {
    return clampChartY(getChartY(total, maxTotal))
}

function getReferenceLabelYs(targetY, averageY) {
    if (targetY === null || averageY === null) {
        return {
            targetLabelY: targetY === null ? null : clampChartY(targetY - 8),
            averageLabelY: averageY === null ? null : clampChartY(averageY + 14)
        }
    }

    if (Math.abs(targetY - averageY) < 18) {
        return {
            targetLabelY: clampChartY(targetY - 14),
            averageLabelY: clampChartY(averageY + 18)
        }
    }

    return {
        targetLabelY: clampChartY(targetY - 8),
        averageLabelY: clampChartY(averageY + 14)
    }
}

function getAverageTotal(series) {
    if (!series.length) {
        return 0
    }

    const total = series.reduce((sum, point) => (
        sum + Number(point.total)
    ), 0)

    return total / series.length
}

function hasTargetThreshold(category) {
    return category?.target_threshold !== null && category?.target_threshold !== undefined
}

function DashboardPage({
    accounts,
    balances,
    loadAccounts,
    loadTransactions,
    syncTransactions,
    uncategorizedCount,
    refreshUncategorizedCount
}) {

    const navigate = useNavigate()

    const [dynamicSummary, setDynamicSummary] = useState(null)
    const [categorySpending, setCategorySpending] = useState(null)
    const [periodPreset, setPeriodPreset] = useState("current_month")
    const initialRange = getPresetRange("current_month")
    const [startDate, setStartDate] = useState(initialRange.startDate)
    const [endDate, setEndDate] = useState(initialRange.endDate)
    const [syncStatus, setSyncStatus] = useState("")
    const [isSyncing, setIsSyncing] = useState(false)
    const [isChartOpen, setIsChartOpen] = useState(false)
    const [chartMode, setChartMode] = useState("categories")
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
    const [selectedGroups, setSelectedGroups] = useState([])
    const [chartData, setChartData] = useState(null)
    const [hoveredSeriesId, setHoveredSeriesId] = useState(null)

    const totalBalance = accounts.reduce((sum, account) => {
        return sum + Number(balances?.[account.id] ?? 0)
    }, 0)

    const categoryGroups = useMemo(() => {
        if (!categorySpending?.categories) {
            return []
        }

        const groupOrder = ["income", "expense", "savings", "investments"]

        return groupOrder
            .map((group) => ({
                group,
                categories: categorySpending.categories
                    .filter((category) => category.reporting_group === group)
                    .filter(shouldShowCategory)
                    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
            }))
            .filter((section) => section.categories.length > 0)
    }, [categorySpending])

    const reportingGroupOptions = useMemo(() => (
        (chartData?.groups || []).filter((group) => (
            group.reporting_group !== "system"
        ))
    ), [chartData])

    const selectedChartSeries = useMemo(() => {
        if (!chartData) {
            return []
        }

        if (chartMode === "categories") {
            return (chartData.categories || [])
                .filter((category) => (
                    selectedCategoryIds.includes(category.category_id)
                ))
                .map((category) => ({
                    id: category.category_id,
                    label: category.category_name,
                    target_threshold: category.target_threshold,
                    series: category.series
                }))
        }

        return reportingGroupOptions
            .filter((group) => (
                selectedGroups.includes(group.reporting_group)
            ))
            .map((group) => ({
                id: group.reporting_group,
                label: getGroupLabel(group.reporting_group),
                target_threshold: group.target_threshold,
                series: group.series
            }))
    }, [chartData, chartMode, reportingGroupOptions, selectedCategoryIds, selectedGroups])

    const selectedChartActualMaxTotal = useMemo(() => {
        const totals = selectedChartSeries.flatMap((item) => (
            item.series.map((point) => Number(point.total))
        ))
        const maxTotal = Math.max(0, ...totals)

        return maxTotal || 1
    }, [selectedChartSeries])

    const hoveredChartSeries = selectedChartSeries.find((item) => (
        item.id === hoveredSeriesId
    ))
    const hoveredChartAverageTotal = hoveredChartSeries
        ? getAverageTotal(hoveredChartSeries.series)
        : null
    const hoveredChartTargetY = hasTargetThreshold(hoveredChartSeries)
        ? getChartReferenceY(hoveredChartSeries.target_threshold, selectedChartActualMaxTotal)
        : null
    const hoveredChartAverageY = hoveredChartAverageTotal !== null
        ? getChartReferenceY(hoveredChartAverageTotal, selectedChartActualMaxTotal)
        : null
    const { targetLabelY, averageLabelY } = getReferenceLabelYs(
        hoveredChartTargetY,
        hoveredChartAverageY
    )
    const chartScaleTicks = selectedChartSeries.length > 0
        ? [
            selectedChartActualMaxTotal,
            selectedChartActualMaxTotal / 2,
            0
        ].map((value) => ({
            value,
            y: getChartY(value, selectedChartActualMaxTotal)
        }))
        : []

    function openCategoryTransactions(categoryId) {
        if (!categoryId) return

        navigate(`/transactions?categoryId=${encodeURIComponent(categoryId)}`, {
            state: { fromDashboard: true, categoryId }
        })
    }

    function updatePreset(preset) {
        setPeriodPreset(preset)

        if (preset === "manual") {
            return
        }

        const range = getPresetRange(preset)
        setStartDate(range.startDate)
        setEndDate(range.endDate)
        loadDashboardData(range.startDate, range.endDate)
    }

    async function loadDashboardData(
        selectedStartDate = startDate,
        selectedEndDate = endDate,
        shouldLoadChart = isChartOpen
    ) {
        try {
            const requests = [
                fetchDashboardDynamicSummary(selectedStartDate, selectedEndDate),
                fetchCategorySpending(selectedStartDate, selectedEndDate)
            ]

            if (shouldLoadChart) {
                requests.push(fetchDashboardChartData(selectedStartDate, selectedEndDate))
            }

            const [summaryData, categoryData, nextChartData] = await Promise.all(requests)

            setDynamicSummary(summaryData)
            setCategorySpending(categoryData)

            if (shouldLoadChart) {
                setChartData(nextChartData)
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function toggleChartSection() {
        const nextIsOpen = !isChartOpen
        setIsChartOpen(nextIsOpen)

        if (!nextIsOpen) {
            return
        }

        setChartMode("categories")
        setSelectedCategoryIds([])
        setSelectedGroups([])
        setHoveredSeriesId(null)

        try {
            const data = await fetchDashboardChartData(startDate, endDate)
            setChartData(data)
        } catch (error) {
            console.error(error)
        }
    }

    function toggleChartSelection(value) {
        if (chartMode === "categories") {
            setSelectedCategoryIds((current) => (
                current.includes(value)
                    ? current.filter((id) => id !== value)
                    : [...current, value]
            ))
            return
        }

        setSelectedGroups((current) => (
            current.includes(value)
                ? current.filter((group) => group !== value)
                : [...current, value]
        ))
    }

    function selectChartMode(mode) {
        const isEnteringGroupsMode = mode === "groups" && chartMode !== "groups"

        setChartMode(mode)
        setHoveredSeriesId(null)

        if (isEnteringGroupsMode) {
            setSelectedGroups([])
        }
    }

    async function syncAllAccounts() {
        const itemIds = [
            ...new Set(
                accounts
                    .map((account) => account.plaid_item_id)
                    .filter(Boolean)
            )
        ]

        if (itemIds.length === 0) {
            const message = "No connected accounts to sync"
            setSyncStatus(message)
            toast(message)
            return
        }

        setIsSyncing(true)
        setSyncStatus("Syncing connected accounts...")

        try {
            const results = await Promise.all(
                itemIds.map((itemId) => syncTransactions(itemId))
            )

            const created = results.reduce((sum, result) => (
                sum + Number(result.transactions_created || 0)
            ), 0)
            const duplicates = results.reduce((sum, result) => (
                sum + Number(result.duplicate_transactions_skipped || 0)
            ), 0)

            await Promise.all([
                loadAccounts(),
                loadTransactions(),
                loadDashboardData(),
                refreshUncategorizedCount()
            ])

            const message = `Sync complete: ${created} added, ${duplicates} duplicates`
            setSyncStatus(message)
            toast.success(message)
        } catch (error) {
            console.error(error)
            setSyncStatus("Sync failed. Check Accounts if reconnect is needed.")
            toast.error("Sync failed")
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => {
        let isCurrent = true

        async function loadInitialDashboardData() {
            try {
                const range = getPresetRange("current_month")
                const [summaryData, categoryData] = await Promise.all([
                    fetchDashboardDynamicSummary(range.startDate, range.endDate),
                    fetchCategorySpending(range.startDate, range.endDate)
                ])

                if (!isCurrent) {
                    return
                }

                setDynamicSummary(summaryData)
                setCategorySpending(categoryData)
            } catch (error) {
                console.error(error)
            }
        }

        loadInitialDashboardData()

        return () => {
            isCurrent = false
        }
    }, [])

    const summaryItems = dynamicSummary ? [
        ["Income", dynamicSummary.income, false],
        ["Expenses", dynamicSummary.expenses, false],
        ["Savings", dynamicSummary.savings, false],
        ["Investments", dynamicSummary.investments, false],
        ["Surplus/Deficit", dynamicSummary.surplus_deficit, true]
    ] : []

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Monthly category spending and account status
                    </p>
                </div>

                <div className="dashboard-actions">
                    <button
                        className="primary-button"
                        onClick={syncAllAccounts}
                        disabled={isSyncing}
                    >
                        {isSyncing ? "Syncing..." : "Sync All"}
                    </button>

                    {syncStatus && (
                        <p className="sync-status">
                            {syncStatus}
                        </p>
                    )}
                </div>
            </header>

            <section className="period-panel">
                <div className="preset-buttons">
                    {[
                        ["current_month", "Current Month"],
                        ["previous_month", "Previous Month"],
                        ["last_3_months", "Last 3 Months"],
                        ["last_6_months", "Last 6 Months"],
                        ["year_to_date", "Year to Date"],
                        ["manual", "Manual"]
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            className={periodPreset === value ? "preset-button active" : "preset-button"}
                            onClick={() => updatePreset(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="reporting-period-controls">
                    <label>
                        Start
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => {
                                setPeriodPreset("manual")
                                setStartDate(event.target.value)
                            }}
                        />
                    </label>

                    <label>
                        End
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => {
                                setPeriodPreset("manual")
                                setEndDate(event.target.value)
                            }}
                        />
                    </label>

                    <button onClick={() => loadDashboardData()}>
                        Apply
                    </button>
                </div>
            </section>

            <div className="dashboard-grid">
                <div className="dashboard-main">
                    <section className="summary-grid">
                        {summaryItems.map(([label, amount, signed]) => (
                            <div
                                key={label}
                                className="summary-card"
                            >
                                <span>{label}</span>
                                <strong>{formatMoney(amount, { signed })}</strong>
                            </div>
                        ))}
                    </section>

                    <section className="chart-panel">
                        <button
                            className="chart-toggle"
                            type="button"
                            onClick={toggleChartSection}
                            aria-expanded={isChartOpen}
                        >
                            <span>Charts</span>
                            <strong>{isChartOpen ? "Hide" : "Show"}</strong>
                        </button>

                        {isChartOpen && (
                            <div className="chart-section">
                                <div className="chart-toolbar">
                                    <div className="segmented-control">
                                        <button
                                            type="button"
                                            className={chartMode === "categories" ? "active" : ""}
                                            onClick={() => selectChartMode("categories")}
                                        >
                                            Categories
                                        </button>
                                        <button
                                            type="button"
                                            className={chartMode === "groups" ? "active" : ""}
                                            onClick={() => selectChartMode("groups")}
                                        >
                                            Reporting Groups
                                        </button>
                                    </div>

                                    <span>
                                        {chartData?.months?.length || 0} month{chartData?.months?.length === 1 ? "" : "s"}
                                    </span>
                                </div>

                                <div className="chart-frame">
                                    <svg
                                        viewBox="0 0 360 220"
                                        role="img"
                                        aria-label="Monthly actual chart"
                                    >
                                        <g className="chart-grid">
                                            {[30, 70, 110, 150, 190].map((y) => (
                                                <line
                                                    key={y}
                                                    x1="40"
                                                    y1={y}
                                                    x2="320"
                                                    y2={y}
                                                />
                                            ))}
                                        </g>
                                        <g className="chart-scale">
                                            {chartScaleTicks.map((tick) => (
                                                <text
                                                    key={tick.value}
                                                    x="34"
                                                    y={tick.y}
                                                >
                                                    {formatCompactMoney(tick.value)}
                                                </text>
                                            ))}
                                        </g>
                                        <line
                                            className="chart-axis"
                                            x1="40"
                                            y1="30"
                                            x2="40"
                                            y2="190"
                                        />
                                        <line
                                            className="chart-axis"
                                            x1="40"
                                            y1="190"
                                            x2="320"
                                            y2="190"
                                        />

                                        {hoveredChartTargetY !== null && (
                                            <>
                                                <line
                                                    className="chart-reference-line chart-reference-line-target"
                                                    x1="40"
                                                    y1={hoveredChartTargetY}
                                                    x2="320"
                                                    y2={hoveredChartTargetY}
                                                />
                                                <text
                                                    className="chart-reference-label chart-reference-label-target"
                                                    x="316"
                                                    y={targetLabelY}
                                                >
                                                    Target Threshold {formatCompactMoney(hoveredChartSeries.target_threshold)}
                                                </text>
                                            </>
                                        )}

                                        {hoveredChartAverageY !== null && (
                                            <>
                                                <line
                                                    className="chart-reference-line chart-reference-line-average"
                                                    x1="40"
                                                    y1={hoveredChartAverageY}
                                                    x2="320"
                                                    y2={hoveredChartAverageY}
                                                />
                                                <text
                                                    className="chart-reference-label chart-reference-label-average"
                                                    x="316"
                                                    y={averageLabelY}
                                                >
                                                    Average Line {formatCompactMoney(hoveredChartAverageTotal)}
                                                </text>
                                            </>
                                        )}

                                        {selectedChartSeries.map((item, index) => (
                                            <polyline
                                                key={item.id}
                                                className="chart-line"
                                                points={buildLinePoints(item.series, selectedChartActualMaxTotal)}
                                                stroke={getCategoryColor(index)}
                                                onMouseEnter={() => setHoveredSeriesId(item.id)}
                                                onMouseLeave={() => setHoveredSeriesId(null)}
                                                onFocus={() => setHoveredSeriesId(item.id)}
                                                onBlur={() => setHoveredSeriesId(null)}
                                                tabIndex={0}
                                            />
                                        ))}
                                    </svg>

                                    {selectedChartSeries.length === 0 && (
                                        <p>
                                            Select categories or reporting groups to draw chart lines.
                                        </p>
                                    )}
                                </div>

                                <details className="chart-selector">
                                    <summary>
                                        {chartMode === "categories" ? "Select Categories" : "Select Reporting Groups"}
                                    </summary>

                                    <div className="chart-selector-menu">
                                        {(chartMode === "categories"
                                            ? chartData?.categories || []
                                            : reportingGroupOptions
                                        ).map((item) => {
                                            const value = chartMode === "categories"
                                                ? item.category_id
                                                : item.reporting_group
                                            const label = chartMode === "categories"
                                                ? item.category_name
                                                : getGroupLabel(item.reporting_group)
                                            const selected = chartMode === "categories"
                                                ? selectedCategoryIds.includes(value)
                                                : selectedGroups.includes(value)

                                            return (
                                                <label
                                                    key={value}
                                                    onMouseEnter={() => {
                                                        if (selected) {
                                                            setHoveredSeriesId(value)
                                                        }
                                                    }}
                                                    onMouseLeave={() => {
                                                        if (selected) {
                                                            setHoveredSeriesId(null)
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => toggleChartSelection(value)}
                                                    />
                                                    {label}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </details>

                                {selectedChartSeries.length > 0 && (
                                    <div className="chart-legend">
                                        {selectedChartSeries.map((item, index) => (
                                            <span
                                                key={item.id}
                                                onMouseEnter={() => setHoveredSeriesId(item.id)}
                                                onMouseLeave={() => setHoveredSeriesId(null)}
                                            >
                                                <i style={{ backgroundColor: getCategoryColor(index) }} />
                                                {item.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {uncategorizedCount > 0 && (
                        <Link
                            to="/uncategorized"
                            className="uncategorized-alert"
                        >
                            {uncategorizedCount} uncategorized transactions need review
                        </Link>
                    )}

                    <section className="report-panel">
                        <div className="section-heading">
                            <h2>Category Details</h2>
                            {categorySpending && (
                                <span>
                                    {categorySpending.months} month{categorySpending.months === 1 ? "" : "s"}
                                </span>
                            )}
                        </div>

                        <div className="table-wrap">
                            <table className="finance-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Average Monthly</th>
                                        <th>Actual</th>
                                        <th>Expected</th>
                                        <th>Diff</th>
                                        <th>% of Income</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {categoryGroups.map((section) => (
                                        <Fragment key={section.group}>
                                            <tr
                                                className="group-row"
                                            >
                                                <td colSpan={6}>
                                                    {getGroupLabel(section.group)}
                                                </td>
                                            </tr>

                                            {section.categories.map((category) => {
                                                const expected = category.target_amount === null || category.target_amount === undefined
                                                    ? null
                                                    : Number(category.target_amount) * Number(categorySpending.months || 1)
                                                const diff = expected === null
                                                    ? null
                                                    : Number(category.total) - expected
                                                const diffPercent = expected
                                                    ? (diff / expected) * 100
                                                    : null

                                                return (
                                                    <tr
                                                        key={category.category_id}
                                                        onClick={() => openCategoryTransactions(category.category_id)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault()
                                                                openCategoryTransactions(category.category_id)
                                                            }
                                                        }}
                                                        className="clickable-row"
                                                        tabIndex={0}
                                                        role="link"
                                                    >
                                                        <td>{category.category_name}</td>
                                                        <td>{formatMoney(category.avg_total)}</td>
                                                        <td>{formatMoney(category.total)}</td>
                                                        <td>{formatMoney(expected)}</td>
                                                        <td
                                                            className="diff-cell"
                                                            style={getDiffStyle(category, diffPercent)}
                                                        >
                                                            {diff === null
                                                                ? ""
                                                                : `${formatMoney(diff, { signed: true })} (${formatPercent(diffPercent, { signed: true })})`
                                                            }
                                                        </td>
                                                        <td>{formatPercent(category.pct_income)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </Fragment>
                                    ))}

                                    {categorySpending && (
                                        <tr className="leftover-row">
                                            <td>Leftover</td>
                                            <td>{formatMoney(categorySpending.leftover, { signed: true })}</td>
                                            <td>
                                                {formatMoney(
                                                    categorySpending.leftover / Number(categorySpending.months || 1),
                                                    { signed: true }
                                                )}
                                            </td>
                                            <td></td>
                                            <td></td>
                                            <td>
                                                {categorySpending.income
                                                    ? formatPercent(
                                                        (categorySpending.leftover / categorySpending.income) * 100,
                                                        { signed: true }
                                                    )
                                                    : ""
                                                }
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <aside className="balance-card">
                    <div className="section-heading">
                        <h2>Balances</h2>
                        <span>{accounts.length}</span>
                    </div>

                    <strong className="balance-total">
                        {formatMoney(totalBalance)}
                    </strong>

                    <div className="balance-list">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className="balance-row"
                            >
                                <span>
                                    {account.name}
                                </span>
                                <strong>
                                    {formatMoney(balances?.[account.id] ?? 0)}
                                </strong>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </main>
    )
}

export default DashboardPage
