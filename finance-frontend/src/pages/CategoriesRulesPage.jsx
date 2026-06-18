import CategoriesSection from "../components/Categories/CategoriesSection"
import RulesSection from "../components/Rules/RulesSection"

function CategoriesRulesPage(props) {

    return (
        <div>

            <h1>Categories & Rules</h1>

            <CategoriesSection
                {...props}
            />

            <hr />

            <RulesSection
                {...props}
            />

        </div>
    )
}

export default CategoriesRulesPage