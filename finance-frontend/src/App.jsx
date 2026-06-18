import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom"

import { useEffect, useState } from "react"
import { 
    fetchTransactions, 
    fetchCategories, 
    updateTransaction, 
    fetchAccounts, 
    fetchAccountBalance, 
    createTransaction, 
    createAccount, 
    updateAccount,
    createCategory,
    updateCategory,
    fetchRules,
    createRule,
    updateRule,
    deleteTransaction,
    deleteAccount,
    deleteCategory,
    deleteRule
} from "./api"

import { Toaster } from "react-hot-toast"
        
import AccountsSection from "./components/Accounts/AccountsSection"
import TransactionsSection from "./components/Transactions/TransactionsSection"
import CategoriesSection from "./components/Categories/CategoriesSection"
import RulesSection from "./components/Rules/RulesSection"
import CsvImportSection from "./components/Import/CsvImportSection"
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
        reporting_group: "expense"
    })

    const [rules, setRules] = useState([])

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


    async function handleCategoryChange(
        transactionId,
        categoryId
    ) {

        try {

            await updateTransaction(
                transactionId,
                {
                    category_id: categoryId || null
                }
            )

            await loadTransactions()

        } catch (error) {
            console.error(error)
        }
    }

    async function loadTransactions() {

        try {
            const data = await fetchTransactions({
                minAmount,
                maxAmount,
                startDate,
                endDate,
                transactionType,
                categoryId,
                accountId,
                descriptionSearch
            })

            setTransactions(data)

        } catch (error) {
            console.error(error)
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
        loadTransactions()
        loadCategories()
        loadAccounts(),
        loadRules()
    }, [])


    async function loadRules() {

        try {

            const data = await fetchRules()

            setRules(data)

        } catch (error) {
            console.error(error)
        }
    }


    return (
        <>
            <Toaster position="top-right" />
            <BrowserRouter>

                <nav>
                    <Link to="/">
                        Dashboard
                    </Link>

                    {" | "}

                    <Link to="/uncategorized">
                        Uncategorized
                    </Link>

                    {" | "}

                    <Link to="/accounts">
                        Accounts
                    </Link>
                    
                    {" | "}

                    <Link to="/transactions">
                        Transactions
                    </Link>

                    {" | "}

                    <Link to="/categories-rules">
                        Categories & Rules
                    </Link>

                    {" | "}

                    <Link to="/import">
                        Import
                    </Link>     
                </nav>

                <Routes>

                    <Route
                        path="/"
                        element={
                            <DashboardPage
                                accounts={accounts}
                                balances={balances}
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

                                newTxn={newTxn}
                                setNewTxn={setNewTxn}
                                initialTxnState={initialTxnState}

                                createTransaction={createTransaction}

                                deleteTransaction={deleteTransaction}

                                transactionType={transactionType}

                                transactionType={transactionType}
                                setTransactionType={setTransactionType}

                                categoryId={categoryId}
                                setCategoryId={setCategoryId}

                                accountId={accountId}
                                setAccountId={setAccountId}

                                descriptionSearch={descriptionSearch}
                                setDescriptionSearch={setDescriptionSearch}
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