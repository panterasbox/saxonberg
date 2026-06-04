id(str)
{
    return(str=="sign");
}

short()
{
    return("A sign has been painted onto the grimy wall here");
}

long()
{
    write("+=======================================================+\n");
    write("|              ABDHOUL'S SLAVE SHOPPE                   |\n");
    write("+=======================================================+\n");
    write("| 'list'                  - list slaves                 |\n");
    write("|                                                       |\n");
    write("| 'info  [name | #]'      - get information on a slave  |\n");
    write("| 'price [name | #]'      - get a quote on a slave      |\n");
    write("| 'buy   [name | #]'      - buy a slave                 |\n");
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

