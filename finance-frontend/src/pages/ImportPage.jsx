import CsvImportSection from "../components/Import/CsvImportSection"

function ImportPage(props) {

    return (
        <div>

            <h1>Import Transactions</h1>

            <CsvImportSection
                {...props}
            />

        </div>
    )
}

export default ImportPage