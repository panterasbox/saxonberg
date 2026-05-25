/* toyshop.c */
 
inherit ShopCode;
 
void extra_create()
{
    add_permanent_item("/zone/null/eternal/objects/map");
    add_property(THISO, "nobuy");
    add_permanent_item("/obj/armor/armor/special/backpack");
    add_permanent_item("/zone/null/eternal/toys/guide");
    add_permanent_item("/zone/null/eternal/toys/highlighter");
    add_permanent_item("/zone/null/eternal/toys/token");
    add_permanent_item("/zone/null/eternal/toys/bracelet");
    add_permanent_item("/zone/null/eternal/toys/digest");
}
