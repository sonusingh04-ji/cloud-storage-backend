const supabase = require("../config/supabase");

const addStar = async (userId, resourceType, resourceId) => {
    const { data: star, error } = await supabase
        .from("stars")
        .insert({
            user_id: userId,
            resource_type: resourceType,
            resource_id: resourceId
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") { // Unique violation
            throw new Error("Item is already starred");
        }
        throw new Error(error.message);
    }
    return star;
};

const removeStar = async (userId, resourceType, resourceId) => {
    const { error } = await supabase
        .from("stars")
        .delete()
        .match({
            user_id: userId,
            resource_type: resourceType,
            resource_id: resourceId
        });

    if (error) {
        throw new Error(error.message);
    }
    return true;
};

module.exports = { addStar, removeStar };