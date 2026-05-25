inherit ArmorCode;

void extra_create()
{
	add("id","helmet");
	add("id","helm");
	add("id","coif");
	add("id","cheap helm");
	set("short","a cheap helm");
	set("long","This is your FREE helmet.  It is protection for you head, and " +
	"it also offers the comfort of a chain mess that covers your neck.  " +
	"It seems very light, almost made of plastic!");
	set("weight",50);
	set("value",0);
	add("areas","head");
	add("areas","neck");
	set("ac",1);
}
