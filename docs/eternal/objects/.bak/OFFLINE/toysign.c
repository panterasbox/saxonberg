/* toysign.c */
 
id(str)
{
    return(str=="sign");
}
 
short()
{
    return("A sign has been stapled to the wall here");
}
 
long()
{
    write("+=======================================================+\n");
    write("|                   GADJETS R US                        |\n");
    write("+=======================================================+\n");
    write("| 'list'                  - list store inventory        |\n");
    write("|                                                       |\n");
    write("| 'view  [name | #]'      - view an item in the store   |\n");
    write("| 'buy   [name | #]'      - buy an item                 |\n");
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
