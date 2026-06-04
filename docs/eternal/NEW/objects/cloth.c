inherit ArmorCode;

int no_dest;

extra_create() {
	set("id", "clothes");
	set("short", "blah");
	set("long", "blah blah blah");

	set("ac", 0);
	set("value", 0);
	set("weight", 0);
  no_dest = 1;
	add_property(THISO, NoBlessP);
	add_property(THISO, NoEnchantP);
	add_property(THISO, NoTemperP);
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
