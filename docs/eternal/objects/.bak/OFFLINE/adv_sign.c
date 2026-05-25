id(str)
{
    return(str=="plaque");
}
 
short()
{
    return("A gold plaque has been mounted on the far wall");
}
 
long()
{
    write("+===================================================================+\n");
    write("|                     ADVENTURER'S GUILD                            |\n");
    write("+-------------------------------------------------------------------+\n");
    write("|  cost <skill>  - determine the cost to train a skill/proficiency  |\n");
    write("|  info <skill>  - get information on a skill/proficiency           |\n");
    write("|  join          - join the Adventurer's guild                      |\n");
    write("|  leave <YES>   - leave the Adventurer's guild                     |\n");
    write("|  members       - list the members of the Adventurer's guild       |\n");
    write("|  skills        - list available skills                            |\n");
    write("|  train <skill> - train a skill/proficiency                        |\n");
    write("+===================================================================+\n");
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
