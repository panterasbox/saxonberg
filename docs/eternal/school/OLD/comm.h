status
Say(object who, string what)
{
    object SAY;
    SAY=FINDO("/secure/player/commands/say");
    SAY->do_command( who, what );
    return 1;
}

status
Tell(object teller, object tellee, string what)
{
    object TELL;
    TELL=FINDO("/secure/player/commands/tell");
    TELL->do_comand(teller, tellee, what);
    return 1;
}
