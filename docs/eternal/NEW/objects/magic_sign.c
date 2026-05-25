/* sign1.c */

id(str)
{
    return(str=="sign");
}

short()
{
	return("The image of a sign floats in the air here");
}

long()
{
    write("+=======================================================+\n");
    write("|        Athenaeum Magica Surplus Sales Store           |\n");
    write("+=======================================================+\n");
    write("| 'list'                  - list store inventory        |\n");
    write("|                                                       |\n");
    write("| 'view  [name | #]'      - view an item in the store   |\n");
    write("| 'buy   [name | #]'      - buy an item                 |\n");
    write("|                                                       |\n");
    write("| 'sell [name]'           - sell an item                |\n");
    write("| 'value [name]'          - estimate item value         |\n");
    write("|                                                       |\n");
    write("| Remember : All sales are final and all sales AS-IS    |\n");
    write("+=======================================================+\n");
    return(1);
}

read(arg)
{
    notify_fail("Read what?\n");
    if (!arg)
        return(0);
    if (lower_case(arg)=="sign") {
        long();
        return(1);
    }
    return(0);
}

init()
{
    add_action("read", "read");
}

