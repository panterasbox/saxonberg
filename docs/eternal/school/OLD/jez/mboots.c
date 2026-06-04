inherit ArmorCode;


void extra_create()
{
	add("id","boots");
	add("id","cheap boots");
	set("short","a pair of cheap boots");
	set("long","These are your very own FREE knee high boots.  They are made from " +
	"the cheapest material around.  They cover your feet, as well as your calves.  " +
	"What a bargain to get such protection for nothing.");
	set("weight",50);
	set("value",0);
	add("areas","left foot");
	add("areas","right foot");
	add("areas","left calf");
	add("areas","right calf");
	set("ac",1);
}

