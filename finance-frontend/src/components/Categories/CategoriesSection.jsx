import { useState } from "react"

function buildCategoryPayload(category) {
    const targetAmountValue = category.target_amount
    const targetAmount = targetAmountValue === ""
        ? null
        : Number(targetAmountValue)

    if (targetAmount !== null && targetAmount < 0) {
        throw new Error("Target amount cannot be negative")
    }

    return {
        ...category,
        target_amount: targetAmount
    }
}

function CategoriesSection({
    categories,

    newCategory,
    setNewCategory,

    createCategory,
    updateCategory,
    deleteCategory,

    loadCategories,
    loadTransactions,
    loadRules
}) {
    const [editingCategoryId, setEditingCategoryId] = useState(null)
    const [categoryEditForm, setCategoryEditForm] = useState({
        name: "",
        reporting_group: "expense",
        target_amount: ""
    })
    const [categoryError, setCategoryError] = useState("")

    return <div>
        <h2>Categories</h2>
        {categoryError && (
            <p role="alert">{categoryError}</p>
        )}

            <input
                placeholder="Category Name"
                value={newCategory.name}
                onChange={(e) =>
                    setNewCategory({
                        ...newCategory,
                        name: e.target.value
                    })
                }
            />

            <select
                value={newCategory.reporting_group}
                onChange={(e) =>
                    setNewCategory({
                        ...newCategory,
                        reporting_group: e.target.value
                    })
                }
            >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="investments">Investments</option>
                <option value="savings">Savings</option>
            </select>

            <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Target Amount"
                value={newCategory.target_amount}
                onChange={(e) =>
                    setNewCategory({
                        ...newCategory,
                        target_amount: e.target.value
                    })
                }
            />

            <button
                onClick={async () => {

                    try {
                        setCategoryError("")

                        await createCategory(
                            buildCategoryPayload(newCategory)
                        )
                    } catch (error) {
                        setCategoryError(error.message)
                        return
                    }

                    await loadCategories()

                    setNewCategory({
                        name: "",
                        reporting_group: "expense",
                        target_amount: ""
                    })
                }}
            >
                Add Category
            </button>

            <table>

                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Reporting Group</th>
                        <th>Target Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>

                    {categories
                        .filter(
                            (cat) =>
                                cat.reporting_group !==
                                "system"
                        )
                        .map((cat) => (

                        <tr key={cat.id}>

                            <td>

                                {
                                    editingCategoryId === cat.id
                                    ? (
                                        <input
                                            value={categoryEditForm.name}
                                            onChange={(e) =>
                                                setCategoryEditForm({
                                                    ...categoryEditForm,
                                                    name: e.target.value
                                                })
                                            }
                                        />
                                    )
                                    : cat.name
                                }

                            </td>
                            <td>

                            {
                                editingCategoryId === cat.id
                                ? (
                                    <select
                                        value={categoryEditForm.reporting_group}
                                        onChange={(e) =>
                                            setCategoryEditForm({
                                                ...categoryEditForm,
                                                reporting_group: e.target.value
                                            })
                                        }
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                        <option value="investments">Investments</option>
                                        <option value="savings">Savings</option>
                                    </select>
                                )
                                : cat.reporting_group
                            }

                            </td>
                            <td>

                            {
                                editingCategoryId === cat.id
                                ? (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={categoryEditForm.target_amount}
                                        onChange={(e) =>
                                            setCategoryEditForm({
                                                ...categoryEditForm,
                                                target_amount: e.target.value
                                            })
                                        }
                                    />
                                )
                                : cat.target_amount ?? ""
                            }

                            </td>

                            <td>

                                {
                                    editingCategoryId === cat.id
                                    ? (
                                        <>
                                            <button
                                                onClick={async () => {

                                                    try {
                                                        setCategoryError("")

                                                        await updateCategory(
                                                            cat.id,
                                                            buildCategoryPayload(
                                                                categoryEditForm
                                                            )
                                                        )
                                                    } catch (error) {
                                                        setCategoryError(
                                                            error.message
                                                        )
                                                        return
                                                    }

                                                    setEditingCategoryId(
                                                        null
                                                    )

                                                    await loadCategories()
                                                }}
                                            >
                                                Save
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setEditingCategoryId(
                                                        null
                                                    )
                                                }
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )
                                    : (
                                        <button
                                            onClick={() => {

                                                setEditingCategoryId(
                                                    cat.id
                                                )

                                                setCategoryEditForm({
                                                    name: cat.name,
                                                    reporting_group: cat.reporting_group,
                                                    target_amount: (
                                                        cat.target_amount ??
                                                        ""
                                                    )
                                                })
                                            }}
                                        >
                                            Edit
                                        </button>
                                    )
                                }

                            </td>
                            <td>
                                <button
                                    onClick={async () => {
                                        await deleteCategory(cat.id)
                                        await loadCategories()
                                        await loadTransactions()
                                        await loadRules()
                                    }}
                                >
                                    Delete
                                </button>
                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

    </div>
}

export default CategoriesSection
