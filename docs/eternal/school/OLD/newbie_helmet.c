inherit ArmorCode;

void extra_create()
{
    set("id",({"helmet","helm","newbie armor","shiny helmet",
	"newbie armor"}) );
    set("short","a shiny metal helmet");
    set("long",
      "This pointed helmet is made of a shiny metal.  It is not very "
      "thick, but it looks well made and should offer some protection "
      "to your neck and head."
    );
    set("weight",50);
    set("value",0);
    add("areas","head");
    add("areas","neck");
    set("ac",1);
}
