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
    write("+================================================================+\n");
    write("|                      TEN SECOND TAILORS                        |\n");
    write("+----------------------------------------------------------------+\n");
    write("|  price <item> <size>  - price to resize <item> to size <size>  |\n");
    write("|  resize <item> <size> - resize <item> to size <size>           |\n");
    write("+================================================================+\n");
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
