import { deleteTransaction, createTransaction, updateTransaction } from "../../api"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function TransactionsSection({
    transactions,
    categories,
    accounts,

    minAmount,
    maxAmount,
    setMinAmount,
    setMaxAmount,

    startDate,
    endDate,
    setStartDate,
    setEndDate,

    loadTransactions,

    newTxn,
    setNewTxn,
    initialTxnState,

    createTransaction,

    deleteTransaction,

    transactionType,
    setTransactionType,
    
    categoryId,
    setCategoryId,  

    accountId,
    setAccountId,
    
    descriptionSearch,
    setDescriptionSearch,

    clearFilters,
    showResultsImmediately = false
}) {
    const navigate = useNavigate()
    const [editingTxnId, setEditingTxnId] = useState(null)

    const [editForm, setEditForm] = useState({
        amount: "",
        description: "",
        date: "",
        category_id: "",
        transaction_type: "expense"
    })

    const [hasSearched, setHasSearched] = useState(showResultsImmediately)
    const [sortBy, setSortBy] = useState("")

    useEffect(() => {
        setHasSearched(showResultsImmediately)
    }, [showResultsImmediately])

    const sortedTransactions = [...transactions].sort((a, b) => {
        switch (sortBy) {
            case "date_asc":
                return new Date(a.date) - new Date(b.date)
            case "date_desc":
                return new Date(b.date) - new Date(a.date)
            case "amount_asc":
                return Number(a.amount) - Number(b.amount)
            case "amount_desc":
                return Number(b.amount) - Number(a.amount)
            case "description_asc":
                return (a.description || "").localeCompare(b.description || "")
            case "description_desc":
                return (b.description || "").localeCompare(a.description || "")
            default:
                return 0
        }
    })

    async function saveEdit(txnId) {
        try {

            await updateTransaction(txnId, {
            ...editForm,
            category_id: editForm.category_id || null
            })

            setEditingTxnId(null)

            await loadTransactions()

        } catch (error) {
            console.error(error)
        }
    }

    function startEdit(txn) {

        setEditingTxnId(txn.id)

        setEditForm({
            amount: txn.amount,
            description: txn.description,
            date: txn.date,
            category_id: txn.category_id || "",
            transaction_type: txn.transaction_type
        })
    }



    return (
        <div>
            <h1>Transactions</h1>

            <div>
              <input
                  type="number"
                  placeholder="Min Amount"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
              />

              <input
                  type="number"
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
              />

              <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
              />

              <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
              />

            <select
                value={transactionType}
                    onChange={(e) =>
                    setTransactionType(e.target.value)
                }
            >
                <option value="">
                    All Types
                </option>

                <option value="expense">
                    Expense
                </option>

                <option value="income">
                    Income
                </option>

                <option value="transfer">
                    Transfer
                </option>
            </select>

            <select
                value={categoryId}
                onChange={(e) =>
                    setCategoryId(e.target.value)
                }
            >
                <option value="">
                    All Categories
                </option>

                {categories.map((cat) => (
                    <option
                        key={cat.id}
                        value={cat.id}
                    >
                        {cat.name}
                    </option>
                ))}
            </select>

            <select
                value={accountId}
                onChange={(e) =>
                    setAccountId(e.target.value)
                }
            >
                <option value="">
                    All Accounts
                </option>

                {accounts.map((acc) => (
                    <option
                        key={acc.id}
                        value={acc.id}
                    >
                        {acc.name} ({acc.type})
                    </option>
                ))}
            </select>

            <input
                placeholder="Search Description"
                value={descriptionSearch}
                onChange={(e) =>
                    setDescriptionSearch(
                        e.target.value
                    )
                }
            />

            </div>

            <button
                onClick={async () => {
                    await loadTransactions()
                    setHasSearched(true)
                }}
            >
                Apply Filters
            </button>

            <button
                onClick={async () => {
                    await clearFilters()
                    setHasSearched(false)
                    setSortBy("")
                    navigate("/transactions", { replace: true })
                }}
                style={{ marginLeft: "8px" }}
            >
                Clear Filters
            </button>

            <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                <label>
                    Sort by:
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="">No sorting</option>
                        <option value="date_desc">Date (Newest first)</option>
                        <option value="date_asc">Date (Oldest first)</option>
                        <option value="amount_desc">Amount (Highest first)</option>
                        <option value="amount_asc">Amount (Lowest first)</option>
                        <option value="description_asc">Description (A to Z)</option>
                        <option value="description_desc">Description (Z to A)</option>
                    </select>
                </label>
            </div>

            {hasSearched && (
                <table>
                    <thead>
                        <tr>
                            <th>Account Name</th>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Category</th>
                            <th>Transaction Type</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sortedTransactions.map((txn) => (

                            <tr key={txn.id}>

                                <td>
                                    {txn.account_name} ({txn.account_type})
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <input
                                            type="date"
                                            value={editForm.date}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    date: e.target.value
                                                })
                                            }
                                        />
                                    ) : (
                                        txn.date
                                    )}
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <input
                                            value={editForm.description}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    description: e.target.value
                                                })
                                            }
                                        />
                                    ) : (
                                        txn.description
                                    )}
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <input
                                            type="number"
                                            value={editForm.amount}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    amount: e.target.value
                                                })
                                            }
                                        />
                                    ) : (
                                        txn.amount
                                    )}
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <select
                                            value={editForm.category_id}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    category_id: e.target.value
                                                })
                                            }
                                        >
                                            <option value="">
                                                Unassigned
                                            </option>

                                            {categories.map((cat) => (
                                                <option
                                                    key={cat.id}
                                                    value={cat.id}
                                                >
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        txn.category_name
                                    )}
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <select
                                            value={editForm.transaction_type}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    transaction_type: e.target.value
                                                })
                                            }
                                        >
                                            <option value="expense">Expense</option>
                                            <option value="income">Income</option>
                                            <option value="transfer">Transfer</option>
                                        </select>
                                    ) : (
                                        txn.transaction_type
                                    )}
                                </td>

                                <td>
                                    {editingTxnId === txn.id ? (
                                        <>
                                            <button onClick={() => saveEdit(txn.id)}>
                                                Save
                                            </button>

                                            <button onClick={() => setEditingTxnId(null)}>
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => startEdit(txn)}>
                                            Edit
                                        </button>
                                    )}
                                </td>
                                <td>
                                    <button
                                        onClick={async () => {
                                            await deleteTransaction(txn.id)
                                            await loadTransactions()
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>

                            </tr>

                        ))}
                    </tbody>
                </table>
            )}

            <h2>Add Transaction</h2>

            <select
                value={newTxn.account_id}
                onChange={(e) =>
                    setNewTxn({ ...newTxn, account_id: e.target.value })
                }
            >

                <option value="">
                    Select Account
                </option>

                {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                    </option>
                ))}

            </select>

            <input
                placeholder="Amount"
                value={newTxn.amount}
                onChange={(e) =>
                    setNewTxn({ ...newTxn, amount: e.target.value })
                }
            />

            <input
                placeholder="Description"
                value={newTxn.description}
                onChange={(e) =>
                    setNewTxn({ ...newTxn, description: e.target.value })
                }
            />

            <input
                type="date"
                value={newTxn.date}
                onChange={(e) =>
                    setNewTxn({ ...newTxn, date: e.target.value })
                }
            />

            <select
                value={newTxn.transaction_type}
                onChange={(e) =>
                    setNewTxn({
                        ...newTxn,
                        transaction_type: e.target.value
                    })
                }
            >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
            </select>

            <select
                value={newTxn.category_id || ""}
                onChange={(e) =>
                    setNewTxn({
                        ...newTxn,
                        category_id: e.target.value
                    })
                }
            >
                <option value="">
                    Unassigned
                </option>

                {categories.map((cat) => (
                    <option
                        key={cat.id}
                        value={cat.id}
                    >
                        {cat.name}
                    </option>
                ))}
            </select>

            <button
                disabled={!newTxn.account_id}
                onClick={async () => {
                    await createTransaction(newTxn)
                    await loadTransactions()

                    setNewTxn(initialTxnState)
                }}
            >
                Add Transaction
            </button>

        </div>
    )
}

export default TransactionsSection