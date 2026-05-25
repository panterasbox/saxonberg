#include "/zone/null/eternal/eternal.h"
id(str)
{
    return(str=="sign");
}
 
short()
{
    return("A framed sign is mounted on the wall here");
}
 
long()
{
    write("+======================================================================+\n");
    write("|                         BED & BREAKFAST INN                          |\n");
    write("+----------------------------------------------------------------------+\n");
    write("|  junk <number>      -  discard stored item <number>                  |\n");
    write("|  list               -  list your stored items                        |\n");
    write("|  retrieve <number>  -  retrieve stored item <number>                 |\n");
    write("|  retrieve <# to #>  -  retrieve stored items from # to #             |\n");
    write("|  store <all|name>   -  store all of your items, or item <name>       |\n");
    write("|  quit               -  save your position and quit the game          |\n");
    write("+======================================================================+\n");
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

