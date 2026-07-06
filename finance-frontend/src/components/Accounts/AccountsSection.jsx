import { createAccount, deleteAccount, updateAccount, createLinkToken, exchangePublicToken, fetchAccounts, syncTransactions, createUpdateLinkToken, resetCursor } from "../../api"
import { useState, useEffect, useCallback } from "react"
import { usePlaidLink } from "react-plaid-link"
import toast from "react-hot-toast"


function AccountsSection({
    newAccount,
    setNewAccount,
    createAccount,
    loadAccounts,
    loadTransactions,

    accounts,
    balances,

    deleteAccount
}) {
    const [editingAccountId, setEditingAccountId] = useState(null)

    const [accountEditForm, setAccountEditForm] = useState({
        name: "",
        type: "",
        opening_balance: 0,
        opening_date: ""
    })

    const [linkToken, setLinkToken] = useState(null)
    const [updateLinkToken, setUpdateLinkToken] = useState(null)
    const [reconnectItemId, setReconnectItemId] = useState(null)

    useEffect(() => {
        createLinkToken()
        .then((data) => setLinkToken(data.link_token))
        .catch((err) => console.error("Failed to create link token:", err));
    }, [])

    const onPlaidSuccess = useCallback(
        async (publicToken) => {
        await exchangePublicToken(publicToken);
        await loadAccounts();
        toast.success("Bank connected successfully")
        },
        [loadAccounts]
    );

    const onUpdateSuccess = useCallback(
        async () => {
            setUpdateLinkToken(null),
            setReconnectItemId(null),
            toast.success("Bank reconnected successfully")
        },
        []
    )

    const { open: openLink, ready: linkReady } = usePlaidLink({
        token: linkToken,
        onSuccess: onPlaidSuccess,
    })

    const { open: openUpdateLink, ready: updateReady } = usePlaidLink({
        token: updateLinkToken,
        onSuccess: onUpdateSuccess
    })


    useEffect(() => {
        if (updateReady && updateLinkToken) {
            openUpdateLink()
        }
    }, [updateReady, updateLinkToken, openUpdateLink])


    const handleSync = async (account) => {
        try {
            const result = await syncTransactions(account.plaid_item_id)
            await loadTransactions()
            toast.success(
                `Added ${result.transactions_created}, duplicates ${result.duplicate_transactions_skipped}, errors ${result.invalid_transactions}, pending ${result.pending_transactions_skipped}`
            )
        } catch (err) {
            if (err.detail?.error_code === "ITEM_LOGIN_REQUIRED") {
                toast.error("This bank needs to be reconnected. Opening link...")
                const { link_token } = await createUpdateLinkToken(err.detail.item_id)
                setReconnectItemId(err.detail.item_id)
                setUpdateLinkToken(link_token)
            } else {
                toast.error("Sync failed. Check console for details.")
                console.error(err)
            }
        }
    }


    function startEditAccount(acc) {

        setEditingAccountId(acc.id)

        setAccountEditForm({
            name: acc.name,
            type: acc.type || "",
            opening_balance: acc.opening_balance,
            opening_date: acc.opening_date
        })
    }


    async function saveAccountEdit(accountId) {

        try {

            await updateAccount(
                accountId,
                accountEditForm
            )

            setEditingAccountId(null)

            await loadAccounts()

        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div>
            <h2>Add Account Manually</h2>
                <input
                    placeholder="Account Name"
                    value={newAccount.name}
                    onChange={(e) =>
                        setNewAccount({
                            ...newAccount,
                            name: e.target.value
                        })
                    }
                />

                <input
                    placeholder="Account Type"
                    value={newAccount.type}
                    onChange={(e) =>
                        setNewAccount({
                            ...newAccount,
                            type: e.target.value
                        })
                    }
                />

                <input
                    type="number"
                    placeholder="Opening Balance"
                    value={newAccount.opening_balance}
                    onChange={(e) =>
                        setNewAccount({
                            ...newAccount,
                            opening_balance: e.target.value
                        })
                    }
                />

                <input
                    type="date"
                    value={newAccount.opening_date}
                    onChange={(e) =>
                        setNewAccount({
                            ...newAccount,
                            opening_date: e.target.value
                        })
                    }
                />

                <button
                    onClick={async () => {

                        await createAccount(newAccount)

                        await loadAccounts()

                        setNewAccount({
                            name: "",
                            type: "",
                            opening_balance: 0,
                            opening_date: new Date().toISOString().split("T")[0]
                        })
                    }}
                >
                    Add Account
                </button>


            <h2>Connenct a Bank Automatically</h2>
            <button onClick={() => openLink()} disabled={!linkReady}>
                Connect a bank
            </button>

            <h2>Accounts</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Opening Balance</th>
                            <th>Opening Date</th>
                            <th>Current Balance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {accounts.map((acc) => (
                            <tr key={acc.id}>
                                <td>
                                {
                                    editingAccountId === acc.id
                                    ? (
                                        <input
                                            value={accountEditForm.name}
                                            onChange={(e) =>
                                                setAccountEditForm({
                                                    ...accountEditForm,
                                                    name: e.target.value
                                                })
                                            }
                                        />
                                    )
                                    : acc.name
                                }
                                </td>
                                <td>
                                {
                                    editingAccountId === acc.id
                                    ? (
                                        <input
                                            value={accountEditForm.type}
                                            onChange={(e) =>
                                                setAccountEditForm({
                                                    ...accountEditForm,
                                                    type: e.target.value
                                                })
                                            }
                                        />
                                    )
                                    : acc.type
                                }
                                </td>
                                <td>
                                {
                                    editingAccountId === acc.id
                                    ? (
                                        <input
                                            type="number"
                                            value={accountEditForm.opening_balance}
                                            onChange={(e) =>
                                                setAccountEditForm({
                                                    ...accountEditForm,
                                                    opening_balance: e.target.value
                                                })
                                            }
                                        />
                                    )
                                    : acc.opening_balance
                                }
                                </td>
                                <td>
                                {
                                    editingAccountId === acc.id
                                    ? (
                                        <input
                                            type="date"
                                            value={accountEditForm.opening_date}
                                            onChange={(e) =>
                                                setAccountEditForm({
                                                    ...accountEditForm,
                                                    opening_date: e.target.value
                                                })
                                            }
                                        />
                                    )
                                    : acc.opening_date
                                }
                                </td>
                                <td>{balances[acc.id] ?? "..."}</td>
                                <td>
                                {
                                    editingAccountId === acc.id
                                    ? (
                                        <>
                                            <button
                                                onClick={() => saveAccountEdit(acc.id)}
                                            >
                                                Save
                                            </button>

                                            <button
                                                onClick={() => setEditingAccountId(null)}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )
                                    : (
                                        <button
                                            onClick={() => startEditAccount(acc)}
                                        >
                                            Edit
                                        </button>
                                    )
                                }
                                </td>
                                <td>
                                    <button
                                        onClick={async () => {
                                            await deleteAccount(acc.id)
                                            await loadAccounts()
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                                <td>
                                    {acc.plaid_item_id && (
                                        <button onClick={() => handleSync(acc)}>
                                            Sync transactions
                                        </button>
                                        )}
                                </td>
                                <td>
                                    {acc.plaid_item_id && (
                                        <button
                                            onClick={async () => {
                                            if (!window.confirm("This will re-pull this bank's full transaction history. Continue?")) return;
                                            await resetCursor(acc.plaid_item_id);
                                            toast.success("Cursor reset — click Sync to pull full history");
                                            }}
                                        >
                                            Reset & resync
                                        </button>
                                        )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

        </div>
    )
}

export default AccountsSection