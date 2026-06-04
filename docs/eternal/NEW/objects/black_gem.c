/* black gem */

inherit ObjectCode;

status query_black_gem()
{
    return(1);
}

void extra_create()
{
    set_name("black gem");
    add_alias("gem");
    set_short("a black gem");
set_long("This is a shiny gem cut from a piece of obsidian.\n");
    set_weight(15);
    set_value(20);
}
