import { useState } from "react"
import { importTransactions } from "../../api"

function CsvImportSection({ accounts, loadTransactions }) {

    const [selectedFile, setSelectedFile] = useState(null)
    const [summary, setSummary] = useState(null)
    const [selectedAccountId, setSelectedAccountId] = useState("")

    async function handleUpload() {

        if (!selectedFile) {
            return
        }

        console.log("Selected account:", selectedAccountId)

        try {

            const result = await importTransactions(
                selectedFile,
                selectedAccountId
            )

            setSummary(result)

            await loadTransactions()

            setSelectedFile(null)
            setSelectedAccountId("")

            console.log(result)

        } catch (error) {

            console.error(error)

            setSummary({
                transactions_created: 0,
                duplicate_transactions_skipped: 0,
                invalid_transactions: 1
            })
        }
    }

    return (
        <div>

            <h2>Import Transactions</h2>

            <select
                value={selectedAccountId}
                onChange={(e) =>
                    setSelectedAccountId(e.target.value)
                }
            >
                <option value="">
                    Select Account
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
                type="file"
                accept=".csv"
                onChange={(e) =>
                    setSelectedFile(
                        e.target.files[0]
                    )
                }
            />

            <button
                disabled={
                    !selectedFile ||
                    !selectedAccountId
                }
                onClick={handleUpload}
            >
                Upload CSV
            </button>

            {summary && (
                <div>
                    <p>Imported: {summary.transactions_created}</p>
                    <p>Duplicates: {summary.duplicate_transactions_skipped}</p>
                    <p>Errors: {summary.invalid_transactions}</p>
                </div>
            )}

        </div>
    )
}

export default CsvImportSection