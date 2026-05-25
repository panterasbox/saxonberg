#include "/zone/null/eternal/eternal.h"
inherit ArmorCode;

int no_dest;

extra_create() {
	set("id", "clothes");
	set("short", "a nondescript article of clothing");
	set("long", "This is an unmodified generic piece of clothing.  Its id is 'clothes'.");
	set("ac", 0);
	set("value", 0);
	set("weight", 2);
	no_dest = 1;
	set(NoBlessP, 1);
	set(NoEnchantP, 1);
	set(NoTemperP, 1);
	set(ArmorP, 0);
        set("material", "cloth");
}

boom (){
  if (no_dest) return;
	write("The "+query("short")+" disintegrates before your eyes!\n");
	say(query("short")+" disintegrates before your eyes!\n");
  destruct (this_object());
}

drop(){
    no_dest = 0;
    call_out ("boom", 5);
	return 0;
}

get()
{
    no_dest = 1;
	return 1;
}
post_long() { return 0; }

int pigs_can_wear() { return 1; }
