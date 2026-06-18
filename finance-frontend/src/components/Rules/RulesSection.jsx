import { createRule, updateRule, deleteRule, reapplyRules } from "../../api"
import { useState } from "react"

function RulesSection({
    rules,
    categories,

    newRule,
    setNewRule,

    createRule,
    updateRule,
    deleteRule,

    loadRules,
    loadTransactions
}) {
    const [editingRuleId, setEditingRuleId] = useState(null)

    const [ruleEditForm, setRuleEditForm] = useState({})    

    return <div>
        <h2>Rules</h2>

            <input
                placeholder="Description Pattern"
                value={newRule.description_pattern}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        description_pattern: e.target.value
                    })
                }
            />

            <input
                type="number"
                placeholder="Amount Equals"
                value={newRule.amount_equals}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        amount_equals: e.target.value
                    })
                }
            />

            <input
                type="number"
                placeholder="Amount Min"
                value={newRule.amount_min}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        amount_min: e.target.value
                    })
                }
            />

            <input
                type="number"
                placeholder="Amount Max"
                value={newRule.amount_max}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        amount_max: e.target.value
                    })
                }
            />

            <select
                value={newRule.category_id}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        category_id: e.target.value
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

            <input
                type="number"
                placeholder="Priority"
                value={newRule.priority}
                onChange={(e) =>
                    setNewRule({
                        ...newRule,
                        priority: e.target.value
                    })
                }
            />

            <button
                onClick={async () => {

                    await createRule({
                        ...newRule,
                        amount_equals:
                            newRule.amount_equals || null,
                        amount_min:
                            newRule.amount_min || null,
                        amount_max:
                            newRule.amount_max || null
                    })

                    await loadRules()

                    setNewRule({
                        description_pattern: "",
                        amount_equals: "",
                        amount_min: "",
                        amount_max: "",
                        category_id: "",
                        priority: 0
                    })
                }}
            >
                Add Rule
            </button>

            <button
                onClick={async () => {

                    try {

                        const result =
                            await reapplyRules()

                        console.log(result)

                        await loadTransactions()

                    } catch (error) {

                        console.error(error)
                    }
                }}
            >
                Reapply Rules
            </button>

            <table>

                <thead>
                    <tr>
                        <th>Pattern</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Equals</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>

                    {rules.map((rule) => (

                        <tr key={rule.id}>

                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <input
                                        value={
                                            ruleEditForm.description_pattern || ""
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                description_pattern:
                                                    e.target.value
                                            })
                                        }
                                    />
                                )
                                : rule.description_pattern
                            }
                            </td>
                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <input
                                        type="number"
                                        value={
                                            ruleEditForm.amount_min ?? ""
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                amount_min:
                                                    e.target.value || null
                                            })
                                        }
                                    />
                                )
                                : rule.amount_min
                            }
                            </td>
                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <input
                                        type="number"
                                        value={
                                            ruleEditForm.amount_max ?? ""
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                amount_max:
                                                    e.target.value || null
                                            })
                                        }
                                    />
                                )
                                : rule.amount_max
                            }
                            </td>
                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <input
                                        type="number"
                                        value={
                                            ruleEditForm.amount_equals ?? ""
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                amount_equals:
                                                    e.target.value || null
                                            })
                                        }
                                    />
                                )
                                : rule.amount_equals
                            }
                            </td>
                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <select
                                        value={
                                            ruleEditForm.category_id || ""
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                category_id:
                                                    e.target.value
                                            })
                                        }
                                    >
                                        {categories.map((cat) => (
                                            <option
                                                key={cat.id}
                                                value={cat.id}
                                            >
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                )
                                : rule.category_name
                            }
                            </td>
                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <input
                                        type="number"
                                        value={
                                            ruleEditForm.priority
                                        }
                                        onChange={(e) =>
                                            setRuleEditForm({
                                                ...ruleEditForm,
                                                priority:
                                                    e.target.value
                                            })
                                        }
                                    />
                                )
                                : rule.priority
                            }
                            </td>

                            <td>
                            {
                                editingRuleId === rule.id
                                ? (
                                    <>
                                        <button
                                            onClick={async () => {

                                                await updateRule(
                                                    rule.id,
                                                    ruleEditForm
                                                )

                                                setEditingRuleId(null)

                                                await loadRules()
                                            }}
                                        >
                                            Save
                                        </button>

                                        <button
                                            onClick={() =>
                                                setEditingRuleId(null)
                                            }
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )
                                : (
                                    <button
                                        onClick={() => {

                                            setEditingRuleId(
                                                rule.id
                                            )

                                            setRuleEditForm({
                                                ...rule
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
                                        await deleteRule(rule.id)
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

export default RulesSection