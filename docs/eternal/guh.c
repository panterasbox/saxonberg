void create()
{
    seteuid(getuid());
}
mixed
query_history()
{
    string *foo, *hist, tmp;
    int i;
    hist=({});
    foo=grab_file("/open/lyrics/NIN/test");
    i=20;
    while(i)
    {
	tmp=foo[random(sizeof(foo))];
	if(searcha(hist,tmp)==-1){
	    hist+=({tmp});
	    i--;
	}
    }
    return hist;
}
