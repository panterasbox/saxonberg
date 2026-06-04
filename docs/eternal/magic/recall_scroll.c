/*
Object created w/ Torenthal's Object Generator
Please leave the above line in the object for future use
*/
inherit ObjectCode;

create(arg)
{
    if (arg) return;
    ::create();

    set("id","scroll");
    add("id","recall");
    add("id","recall scroll");
    add("id","scroll of recall");
    set("short","a scroll of recall");
    set("long","This scroll when recited will magically "+
      "transport you somewhere.\n");
    set("read","A Scroll of Recall\n");
    set("weight", 10);
    set("value", 1250);
    set("gettable", 1);
    set("droppable", 1);
}

init()
{
    ::init();
    add_action("recall","recite");
}
recall(str){
    if (str=="scroll" || str=="recall"){
	say(PNAME+" is sucked into another dimension.\n");
	switch (random(3)) {
	case 0:
	    move_object(THISP, "/zone/null/void");
	    break;
	case 1:
	    move_object(THISP, "/zone/null/eternal/common");
	    break;
	case 2:
	    move_object(THISP, "/zone/null/eternal/bbinn1");
	    break;
	}
	command("look",THISP);
	say(PNAME+" appears with a loud bang.\n");
	destruct(THISO);
	return 1;
    }
}
