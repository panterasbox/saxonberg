inherit ThingCode2;

void extra_create()
{
    set( "id", "sign" );
    set("short", "a sign");
    set("gettable", 0);
    set("extra_short", ".  If you're an idiot, you should look at it" );
    set("read", "Look at it, moron, don't read it!\n");
    set("long",
        "Not everything is the way you assume it to be.\n"+
        "Nothing works correctly 100% of the time.\n"+
        "Not all of your suggestions will be considered good ones.\n"+
        "Live and learn." );
}
