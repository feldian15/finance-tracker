import { useEffect, useState } from "react"

import {
    fetchUncategorizedTransactions,
    fetchCategories,
    updateTransaction,
    createRule,
    reapplyRules
} from "../api"


function UncategorizedPage() {
    const [transactions, setTransactions] = useState([])
    const [categories, setCategories] = useState([])
    const [selectedCategories, setSelectedCategories] = useState({})
    const [createRuleFlags, setCreateRuleFlags] = useState({})


    async function loadTransactions() {

        try {

            const data =
                await fetchUncategorizedTransactions()

            setTransactions(data)

        } catch (error) {

            console.error(error)
        }
    }


    async function loadCategories() {

        try {

            const data =
                await fetchCategories()

            setCategories(data)

        } catch (error) {

            console.error(error)
        }
    }


    async function saveCategory(transactionId) {

        const categoryId =
            selectedCategories[transactionId]

        if (!categoryId) {
            return
        }

        try {

            const txn = transactions.find(
                (t) => t.id === transactionId
            )

            await updateTransaction(
                transactionId,
                {
                    category_id: categoryId
                }
            )

            if (createRuleFlags[transactionId]) {

                await createRule({
                    description_pattern:
                        txn.description,

                    amount_equals: null,
                    amount_min: null,
                    amount_max: null,

                    category_id: categoryId,

                    priority: 0
                })

                await reapplyRules()
            }

            await loadTransactions()

        } catch (error) {

            console.error(error)
        }
    } 

    useEffect(() => {
        loadTransactions()
        loadCategories()
    }, [])

    return (
        <div>

            <h1>
                Uncategorized Transactions
            </h1>

            <table>

                <thead>

                    <tr>
                        <th>Account</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Transaction Type</th>
                        <th>Category</th>
                        <th>Create Rule</th>
                        <th>Actions</th>
                    </tr>

                </thead>

                <tbody>

                    {transactions.map((txn) => (

                        <tr key={txn.id}>

                            <td>{txn.account_name} ({txn.account_type})</td>

                            <td>{txn.date}</td>

                            <td>{txn.description}</td>

                            <td>{txn.amount}</td>

                            <td>
                                <select
                                    value={txn.transaction_type}
                                    onChange={async (e) => {
                                        await updateTransaction(
                                            txn.id,
                                            {
                                                transaction_type:
                                                    e.target.value
                                            }
                                        )
                                        await loadTransactions()
                                    }}
                                >
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
                            </td>

                            <td>

                                <select
                                    value={
                                        selectedCategories[txn.id] || ""
                                    }
                                    onChange={(e) =>
                                        setSelectedCategories({
                                            ...selectedCategories,
                                            [txn.id]: e.target.value
                                        })
                                    }
                                >

                                    <option value="">
                                        Select Category
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

                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={
                                        createRuleFlags[txn.id] || false
                                    }
                                    onChange={(e) =>
                                        setCreateRuleFlags({
                                            ...createRuleFlags,
                                            [txn.id]: e.target.checked
                                        })
                                    }
                                />

                            </td>
                            <td>
                                <button
                                    disabled={
                                        !selectedCategories[txn.id]
                                    }
                                    onClick={() =>
                                        saveCategory(txn.id)
                                    }
                                >
                                    Save
                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    )
}

export default UncategorizedPage