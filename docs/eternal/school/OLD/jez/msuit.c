inherit ArmorCode;

void extra_create()
{
	add("id","suit");
	add("id","cheap armor");
	set("short","a cheap suit of armor");
	set("long","This is your FREE suit of armor.  It will cover many areas of your body " +
	"including your chest, stomach, left shoulder, and right shoulder.  It seems to be " +
	"made of rather cheap material, but hey, what did you expect for free?");
	set("ac",2);
	add("areas","chest");
	add("areas","stomach");
	add("areas","left shoulder");
	add("areas","right shoulder");
	set("weight",250);
	set("value",0);
}
