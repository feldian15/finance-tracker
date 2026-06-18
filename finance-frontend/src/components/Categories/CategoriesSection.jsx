import { createCategory, updateCategory, deleteCategory } from "../../api"
import { useState } from "react"

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
        reporting_group: "expense"
    })

    return <div>
        <h2>Categories</h2>

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

            <button
                onClick={async () => {

                    await createCategory(newCategory)

                    await loadCategories()

                    setNewCategory({
                        name: "",
                        reporting_group: "expense"
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
                                        <>
                                            <button
                                                onClick={async () => {

                                                    await updateCategory(
                                                        cat.id,
                                                        categoryEditForm
                                                    )

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
                                                    reporting_group: cat.reporting_group
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