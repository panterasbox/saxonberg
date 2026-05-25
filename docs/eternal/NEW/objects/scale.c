#define RED ( ansi ? "[31m" : "" )
#define NORM ( ansi ? "[0m" : "" )
inherit ObjectCode;

	extra_create()
	{
    set("id","scale");
    set("short","Anthrax's Magic Scale");
    set("long","This is a large, flat, boxlike device, with some sort of "+
        "display window on the front.  You can try to 'weigh <item>' on "+
        "it...\n");
    set( MagicP, 1 );
    set("gettable", 0);
    set("droppable", 0);
	}

extra_init()
	{
	add_action("weigh","weigh");
	}

weigh(string str)
	{
       object thing;
	int weight, ansi;

	if(!str || !present(str, THISP))
		{
		write("Weigh what?\n");
		return 1;}

	thing=present(str, THISP);
	ansi = THISP->query_ansi();
       weight=thing->query("weight");

       write("You place "+thing->query("short")+" on the Magic Scale.\n");
       say(PNAME+" places "+thing->query("short")+" on the Magic Scale.\n");
	tell_room(environment(THISO),"A large, glowing red number appears on the display: "+RED+weight+NORM+"\n");
	return 1; 
	}
