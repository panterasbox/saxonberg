/* slave_care.c */

inherit ObjectCode;

#define THIS_FILE "/zone/null/eternal/objects/slave_booklet"

extra_create()
{
    set_name("slave use and care booklet");
    add_alias("booklet");
    set_short("a slave use and care booklet");
    set_value(0);
    set_weight(0);
    set_long(
      "Abdhoul's Slave Shoppe only deals in the finest slaves, you will never\n" +
      "have to feed any slave you purchase from our wide selection.  Our slaves\n" +
      "are also disciplined to the bone, they will follow (at least attempt to\n" +
      "follow) every command you issue to them.  You can issue commands to your\n" +
      "slave by 'telling' them your command.\n\n" +
      "    Example: tell slave get all\n\n" +
      "The above command will instruct your slave to pick up all of the objects\n" +
      "in the room.  In addition to most player commands, slaves have the 'status'\n" +
      "and the 'name' commands.\n\n" +
      "    Example: tell slave status\n\n" +
      "The above command will report to you the status of your slave, the current\n" +
      "and maximum hitpoints, mana, and fatigue values will be displayed.\n\n" +
      "    Example: tell slave name Guido\n\n" +
      "The 'name' command will allow you to change or assign a name to your slave.\n" +
      "In the above example, the slave's name would have been changed to 'Guido'.\n\n" +
      "You can also store your slave in your locker for a fee depending on how\n" +
      "hard your slave will attempt to escape the locker once you leave.  Of\n" +
      "course, thieves who steal slaves are also not uncommon.  Nevertheless, do\n" +
      "enjoy your slave(s), and if you don't have one already, GET ONE!\n");
     set_read(query_long());
}

get()
{
    if (file_name(environment(THISO))=="/zone/null/eternal/slave_shop")
        move_object(clone_object(THIS_FILE), environment(THISO));
    return(::get());
}

drop()
{
    write("You drop the booklet and it explodes into nothingness.\n");
    say(THISP->query_name() + " drops a booklet and it explodes into nothingness.\n");
    destruct(THISO);
    return(0);
}

