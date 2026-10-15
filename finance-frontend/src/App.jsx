import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom"

import { useCallback, useEffect, useState } from "react"
import { 
    fetchTransactions, 
    fetchCategories, 
    fetchAccounts, 
    fetchAccountBalance, 
    createTransaction, 
    createAccount, 
    createCategory,
    updateCategory,
    fetchRules,
    createRule,
    updateRule,
    deleteTransaction,
    deleteAccount,
    deleteCategory,
    deleteRule,
    fetchUncategorizedTransactions,
    syncTransactions
} from "./api"

import { Toaster } from "react-hot-toast"
        
import UncategorizedPage from "./pages/UncategorizedPage"
import AccountsPage from "./pages/AccountsPage"
import TransactionsPage from "./pages/TransactionsPage"
import CategoriesRulesPage from "./pages/CategoriesRulesPage"
import ImportPage from "./pages/ImportPage"
import DashboardPage from "./pages/DashboardPage"

function App() {

    const [transactions, setTransactions] = useState([])
    
    const [categories, setCategories] = useState([])
    
    const [accounts, setAccounts] = useState([])
    
    const [balances, setBalances] = useState({})
    
    const [minAmount, setMinAmount] = useState("")
    
    const [maxAmount, setMaxAmount] = useState("")
    
    const [startDate, setStartDate] = useState("")

    const [endDate, setEndDate] = useState("")

    const initialTxnState = {
        account_id: "",
        amount: "",
        description: "",
        date: "",
        transaction_type: "expense",
        category_id: ""
    }

    const [newTxn, setNewTxn] = useState(initialTxnState)

    const [newAccount, setNewAccount] = useState({
        name: "",
        type: "",
        opening_balance: 0,
        opening_date: ""
    })

    const [newCategory, setNewCategory] = useState({
        name: "",
        reporting_group: "expense",
        target_amount: ""
    })

    const [rules, setRules] = useState([])
    const [uncategorizedCount, setUncategorizedCount] = useState(0)

    const [newRule, setNewRule] = useState({
        description_pattern: "",
        amount_equals: "",
        amount_min: "",
        amount_max: "",
        category_id: "",
        priority: 0
    })

    const [transactionType, setTransactionType] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [accountId, setAccountId] = useState("")
    const [descriptionSearch, setDescriptionSearch] = useState("")
    const [needsReview, setNeedsReview] = useState(null)
    const [appliedTransactionFilters, setAppliedTransactionFilters] = useState(null)

    const loadTransactions = useCallback(async (
        filterOverrides = {},
        options = {}
    ) => {

        try {
            const baseFilters = options.ignoreDraftFilters ? {} : {
                minAmount,
                maxAmount,
                startDate,
                endDate,
                transactionType,
                categoryId,
                accountId,
                descriptionSearch,
                needsReview
            }

            const filters = {
                ...baseFilters,
                ...filterOverrides
            }

            const data = await fetchTransactions(filters)

            setAppliedTransactionFilters(filters)
            setTransactions(data)

        } catch (error) {
            console.error(error)
        }
    }, [
        minAmount,
        maxAmount,
        startDate,
        endDate,
        transactionType,
        categoryId,
        accountId,
        descriptionSearch,
        needsReview
    ])

    async function refreshTransactions() {
        if (!appliedTransactionFilters) {
            return
        }

        try {
            const data = await fetchTransactions(appliedTransactionFilters)
            setTransactions(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function clearFilters() {
        setMinAmount("")
        setMaxAmount("")
        setStartDate("")
        setEndDate("")
        setTransactionType("")
        setCategoryId("")
        setAccountId("")
        setDescriptionSearch("")
        setNeedsReview(null)

        if (window.location.pathname === "/transactions") {
            const url = new URL(window.location.href)
            url.searchParams.delete("categoryId")
            window.history.replaceState({}, "", url)
        }
    }

    async function loadCategories() {

        try {
            const data = await fetchCategories()
            setCategories(data)

        } catch (error) {
            console.error(error)
        }
    }

    async function loadAccounts() {

        try {
            const accountsData = await fetchAccounts()
            setAccounts(accountsData)

            const balancePromises = accountsData.map(async (acc) => {

                const result = await fetchAccountBalance(acc.id)

                return {
                    id: acc.id,
                    balance: result.balance
                }
            })

            const results = await Promise.all(balancePromises)

            const balanceMap = {}

            results.forEach((item) => {
                balanceMap[item.id] = item.balance
            })

            setBalances(balanceMap)

        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        async function loadInitialData() {
            await clearFilters()
            await loadCategories()
            await loadAccounts()
            await loadRules()
            await loadUncategorizedCount()
        }

        loadInitialData()
    }, [])


    async function loadRules() {

        try {

            const data = await fetchRules()

            setRules(data)

        } catch (error) {
            console.error(error)
        }
    }

    async function loadUncategorizedCount() {
        try {
            const data = await fetchUncategorizedTransactions()
            setUncategorizedCount(data.length)
        } catch (error) {
            console.error(error)
        }
    }


    return (
        <>
            <Toaster position="top-right" />
            <BrowserRouter>

                <nav className="app-nav">
                    <Link to="/">
                        Dashboard
                    </Link>

                    <Link to="/accounts">
                        Accounts
                    </Link>

                    <Link to="/transactions">
                        Transactions
                    </Link>

                    <Link to="/categories-rules">
                        Categories & Rules
                    </Link>

                    <Link to="/import">
                        Import
                    </Link>     

                    <Link
                        to="/uncategorized"
                        className="nav-alert-link"
                    >
                        Uncategorized
                        {uncategorizedCount > 0 && (
                            <span className="nav-count">
                                {uncategorizedCount}
                            </span>
                        )}
                    </Link>
                </nav>

                <Routes>

                    <Route
                        path="/"
                        element={
                            <DashboardPage
                                accounts={accounts}
                                balances={balances}
                                loadAccounts={loadAccounts}
                                loadTransactions={loadTransactions}
                                syncTransactions={syncTransactions}
                                uncategorizedCount={uncategorizedCount}
                                refreshUncategorizedCount={loadUncategorizedCount}
                            />
                        }
                    />

                    <Route
                        path="/accounts"
                        element={
                            <AccountsPage
                                newAccount={newAccount}
                                setNewAccount={setNewAccount}
                                createAccount={createAccount}
                                loadAccounts={loadAccounts}
                                loadTransactions={loadTransactions}

                                accounts={accounts}
                                balances={balances}

                                deleteAccount={deleteAccount}
                            />
                        }
                    />

                    <Route
                        path="/transactions"
                        element={
                            <TransactionsPage
                                transactions={transactions}
                                categories={categories}
                                accounts={accounts}

                                minAmount={minAmount}
                                maxAmount={maxAmount}
                                setMinAmount={setMinAmount}
                                setMaxAmount={setMaxAmount}

                                startDate={startDate}
                                endDate={endDate}
                                setStartDate={setStartDate}
                                setEndDate={setEndDate}

                                loadTransactions={loadTransactions}
                                refreshTransactions={refreshTransactions}

                                newTxn={newTxn}
                                setNewTxn={setNewTxn}
                                initialTxnState={initialTxnState}

                                createTransaction={createTransaction}

                                deleteTransaction={deleteTransaction}

                                transactionType={transactionType}
                                setTransactionType={setTransactionType}

                                categoryId={categoryId}
                                setCategoryId={setCategoryId}

                                accountId={accountId}
                                setAccountId={setAccountId}

                                descriptionSearch={descriptionSearch}
                                setDescriptionSearch={setDescriptionSearch}
                                needsReview={needsReview}
                                setNeedsReview={setNeedsReview}
                                clearFilters={clearFilters}
                            />
                        }
                    />

                    <Route
                        path="/categories-rules"
                        element={
                            <CategoriesRulesPage
                                categories={categories}

                                newCategory={newCategory}
                                setNewCategory={setNewCategory}

                                createCategory={createCategory}
                                updateCategory={updateCategory}
                                deleteCategory={deleteCategory}

                                loadCategories={loadCategories}
                                loadTransactions={loadTransactions}
                                loadRules={loadRules}

                                rules={rules}

                                newRule={newRule}
                                setNewRule={setNewRule}

                                createRule={createRule}
                                updateRule={updateRule}
                                deleteRule={deleteRule}
                            />
                        }
                    />

                    <Route
                        path="/import"
                        element={
                            <ImportPage
                                accounts={accounts}
                                loadTransactions={loadTransactions}
                            />
                        }
                    />

                    <Route
                        path="/uncategorized"
                        element={<UncategorizedPage />}
                    />

                </Routes>

            </BrowserRouter>
        </>
    )
    // return (   
    //     <div>
    //         <CsvImportSection
    //             accounts={accounts}
    //             loadTransactions={loadTransactions}
    //         />
    //         <AccountsSection
    //             newAccount={newAccount}
    //             setNewAccount={setNewAccount}
    //             createAccount={createAccount}
    //             loadAccounts={loadAccounts}

    //             accounts={accounts}
    //             balances={balances}

    //             deleteAccount={deleteAccount}
    //         />

    //         <TransactionsSection
    //             transactions={transactions}
    //             categories={categories}
    //             accounts={accounts}

    //             minAmount={minAmount}
    //             maxAmount={maxAmount}
    //             setMinAmount={setMinAmount}
    //             setMaxAmount={setMaxAmount}

    //             startDate={startDate}
    //             endDate={endDate}
    //             setStartDate={setStartDate}
    //             setEndDate={setEndDate}

    //             loadTransactions={loadTransactions}

    //             newTxn={newTxn}
    //             setNewTxn={setNewTxn}
    //             initialTxnState={initialTxnState}

    //             createTransaction={createTransaction}

    //             deleteTransaction={deleteTransaction}
    //         />

    //         <CategoriesSection
    //             categories={categories}

    //             newCategory={newCategory}
    //             setNewCategory={setNewCategory}

    //             createCategory={createCategory}
    //             updateCategory={updateCategory}
    //             deleteCategory={deleteCategory}

    //             loadCategories={loadCategories}
    //             loadTransactions={loadTransactions}
    //             loadRules={loadRules}
    //         />

    //         <RulesSection
    //             rules={rules}
    //             categories={categories}

    //             newRule={newRule}
    //             setNewRule={setNewRule}

    //             createRule={createRule}
    //             updateRule={updateRule}
    //             deleteRule={deleteRule}

    //             loadRules={loadRules}
    //         />
    //     </div>

        
    // )
}

export default App
